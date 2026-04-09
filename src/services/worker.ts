import { prisma } from '@/lib/prisma';
import { GeminiProvider } from '@/services/providers/gemini';
import type { Job } from '@/generated/prisma/client';

const POLL_INTERVAL_MS = 2000;
const CONCURRENCY = 3; // Phase 1 parallelism
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (GD-06)
const MAX_OUTPUT_SIZE = 15 * 1024 * 1024; // 15MB (GD-05)

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

const provider = new GeminiProvider();

/**
 * Claim one QUEUED job using SELECT ... FOR UPDATE SKIP LOCKED,
 * atomically set status to PROCESSING.
 */
async function claimJob(): Promise<Job | null> {
  const rows = await prisma.$queryRawUnsafe<Job[]>(`
    UPDATE "Job"
    SET status = 'PROCESSING', "startedAt" = NOW()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status = 'QUEUED'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Process a single job: call the AI provider, update the result.
 */
async function processJob(job: Job): Promise<void> {
  const startMs = Date.now();

  try {
    const result = await provider.generate({
      modelImage: { base64: job.modelImageBase64, mime: job.modelImageMime },
      topImage: { base64: job.topImageBase64, mime: job.topImageMime },
      bottomImage: { base64: job.bottomImageBase64, mime: job.bottomImageMime },
      prompt: job.prompt,
    });

    // Check output size (GD-05)
    const outputSizeBytes = Buffer.byteLength(result.base64, 'base64');
    if (outputSizeBytes > MAX_OUTPUT_SIZE) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorCode: 'ERR_OUTPUT_TOO_LARGE',
          errorMessage: '輸出圖片過大',
          completedAt: new Date(),
          durationMs: Date.now() - startMs,
        },
      });
      return;
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        outputBase64: result.base64,
        outputMime: result.mime,
        tokensUsed: result.tokens,
        durationMs: Date.now() - startMs,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const errorCode =
      error instanceof Error && 'code' in error
        ? (error as { code: string }).code
        : 'ERR_INTERNAL';
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Worker] Job ${job.id} failed:`, errorMessage);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorCode,
        errorMessage,
        completedAt: new Date(),
        durationMs: Date.now() - startMs,
      },
    });
  }
}

/**
 * Single worker tick: claim and process up to CONCURRENCY jobs in parallel.
 */
async function tick(): Promise<void> {
  if (isRunning) return; // Prevent concurrent ticks (GD-03)
  isRunning = true;

  try {
    // Claim up to CONCURRENCY jobs
    const jobs: Job[] = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const job = await claimJob();
      if (!job) break;
      jobs.push(job);
    }

    if (jobs.length === 0) return;

    // Process all claimed jobs in parallel
    await Promise.allSettled(jobs.map((job) => processJob(job)));
  } catch (error) {
    console.error('[Worker] Tick error:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Mark PROCESSING jobs that have been stuck for over 5 minutes as FAILED (GD-06).
 */
async function timeoutStaleJobs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT_MS);
    await prisma.job.updateMany({
      where: {
        status: 'PROCESSING',
        startedAt: { lt: cutoff },
      },
      data: {
        status: 'FAILED',
        errorCode: 'ERR_WORKER_TIMEOUT',
        errorMessage: '處理逾時',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Worker] Timeout check error:', error);
  }
}

export function startWorker(): void {
  if (intervalId) return;
  console.log('[Worker] Starting worker (poll every 2s, concurrency 3)');

  intervalId = setInterval(async () => {
    await tick();
    await timeoutStaleJobs();
  }, POLL_INTERVAL_MS);
}

export function stopWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Worker] Stopped');
  }
}
