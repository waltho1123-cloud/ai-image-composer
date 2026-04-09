import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

// GET /api/v1/jobs/[id] -- Get single job metadata
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
        prompt: true,
        modelImageMime: true,
        topImageMime: true,
        bottomImageMime: true,
        outputMime: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        durationMs: true,
        tokensUsed: true,
        startedAt: true,
        completedAt: true,
        expiresAt: true,
        createdAt: true,
        modelProvider: true,
        modelName: true,
        // Exclude base64 fields
      },
    });

    if (!job) {
      return errorResponse('ERR_NOT_FOUND' as ErrorCode);
    }

    // Authorization: ensure user owns the job
    if (job.userId !== session.userId) {
      return errorResponse('ERR_NOT_FOUND' as ErrorCode);
    }

    return Response.json(job);
  } catch (error) {
    console.error('[GET /api/v1/jobs/[id]] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
