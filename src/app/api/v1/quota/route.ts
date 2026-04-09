import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

const DAILY_LIMIT = 20;

// GET /api/v1/quota -- Get user's daily quota
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const quotaLog = await prisma.quotaLog.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date: today,
        },
      },
    });

    const used = quotaLog?.count ?? 0;

    return Response.json({
      used,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - used),
    });
  } catch (error) {
    console.error('[GET /api/v1/quota] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
