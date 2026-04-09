import { prisma } from '@/lib/prisma';

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_BATCH_SIZE = 1000; // GD-07
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (GD-06)

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Clean expired job outputs: clear outputBase64 and all input image base64 fields
 * for jobs whose expiresAt has passed. Process in batches of 1000.
 */
async function cleanExpiredOutputs(): Promise<void> {
  try {
    const now = new Date();

    // Find expired jobs that still have data to clean
    // outputBase64 is nullable; inputBase64 is non-nullable so check for non-empty
    const expiredJobs = await prisma.job.findMany({
      where: {
        expiresAt: { lt: now },
        OR: [
          { outputBase64: { not: null } },
          { modelImageBase64: { not: '' } },
          { topImageBase64: { not: '' } },
          { bottomImageBase64: { not: '' } },
        ],
      },
      select: { id: true },
      take: MAX_BATCH_SIZE,
    });

    if (expiredJobs.length === 0) return;

    const ids = expiredJobs.map((j: { id: string }) => j.id);

    await prisma.job.updateMany({
      where: { id: { in: ids } },
      data: {
        outputBase64: null,
        modelImageBase64: '',
        topImageBase64: '',
        bottomImageBase64: '',
      },
    });

    console.log(`[Cleanup] Cleaned ${ids.length} expired jobs`);
  } catch (error) {
    console.error('[Cleanup] Error cleaning expired outputs:', error);
  }
}

/**
 * Force-fail PROCESSING jobs that have been stuck for over 5 minutes (GD-06).
 */
async function timeoutStaleJobs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT_MS);

    const result = await prisma.job.updateMany({
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

    if (result.count > 0) {
      console.log(`[Cleanup] Timed out ${result.count} stale PROCESSING jobs`);
    }
  } catch (error) {
    console.error('[Cleanup] Error timing out stale jobs:', error);
  }
}

async function runCleanup(): Promise<void> {
  await cleanExpiredOutputs();
  await timeoutStaleJobs();
}

export function startCleanup(): void {
  if (intervalId) return;
  console.log('[Cleanup] Starting cleanup (every 10 minutes)');

  // Run once immediately on startup
  runCleanup();

  intervalId = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

export function stopCleanup(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Cleanup] Stopped');
  }
}
