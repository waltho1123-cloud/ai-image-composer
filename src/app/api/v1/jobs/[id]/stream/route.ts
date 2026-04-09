import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

const POLL_INTERVAL_MS = 1500;
const MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes (GD-02)

// GET /api/v1/jobs/[id]/stream -- SSE progress stream
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
  }

  const { id } = await params;

  // Verify job exists and belongs to user
  const initialJob = await prisma.job.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!initialJob || initialJob.userId !== session.userId) {
    return errorResponse('ERR_NOT_FOUND' as ErrorCode);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();

      function send(event: string, data: Record<string, unknown>) {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      }

      try {
        while (true) {
          // Check max duration
          if (Date.now() - startTime > MAX_DURATION_MS) {
            send('error', {
              status: 'TIMEOUT',
              errorCode: 'ERR_WORKER_TIMEOUT',
              errorMessage: '連線已逾時',
            });
            controller.close();
            return;
          }

          const job = await prisma.job.findUnique({
            where: { id },
            select: {
              status: true,
              errorCode: true,
              errorMessage: true,
            },
          });

          if (!job) {
            send('error', {
              status: 'FAILED',
              errorCode: 'ERR_NOT_FOUND',
              errorMessage: '找不到該任務',
            });
            controller.close();
            return;
          }

          if (job.status === 'COMPLETED') {
            send('complete', {
              status: 'COMPLETED',
              resultUrl: `/api/v1/jobs/${id}/result`,
            });
            controller.close();
            return;
          }

          if (job.status === 'FAILED') {
            send('error', {
              status: 'FAILED',
              errorCode: job.errorCode ?? 'ERR_INTERNAL',
              errorMessage: job.errorMessage ?? '處理失敗',
            });
            controller.close();
            return;
          }

          // Send current status (QUEUED or PROCESSING)
          send('status', { status: job.status });

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      } catch (error) {
        console.error('[SSE stream] Error:', error);
        try {
          send('error', {
            status: 'FAILED',
            errorCode: 'ERR_INTERNAL',
            errorMessage: '串流發生錯誤',
          });
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
