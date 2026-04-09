import { destroySession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

export async function POST() {
  try {
    await destroySession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[logout] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
