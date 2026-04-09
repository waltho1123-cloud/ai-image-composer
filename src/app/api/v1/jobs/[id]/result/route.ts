import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

// GET /api/v1/jobs/[id]/result -- Get completed job result
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        outputBase64: true,
        outputMime: true,
        expiresAt: true,
      },
    });

    if (!job) {
      return errorResponse('ERR_NOT_FOUND' as ErrorCode);
    }

    // Authorization
    if (job.userId !== session.userId) {
      return errorResponse('ERR_NOT_FOUND' as ErrorCode);
    }

    // Must be completed
    if (job.status !== 'COMPLETED') {
      return Response.json(
        { error: { code: 'ERR_NOT_READY', message: '任務尚未完成' } },
        { status: 400 },
      );
    }

    // Check expiry
    if (new Date() > job.expiresAt) {
      return errorResponse('ERR_GONE' as ErrorCode);
    }

    // Check if output has been cleaned up
    if (!job.outputBase64) {
      return errorResponse('ERR_GONE' as ErrorCode);
    }

    return Response.json({
      jobId: job.id,
      mime: job.outputMime,
      base64: job.outputBase64,
      expiresAt: job.expiresAt,
    });
  } catch (error) {
    console.error('[GET /api/v1/jobs/[id]/result] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
