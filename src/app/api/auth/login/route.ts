import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return Response.json(
        { error: { code: 'ERR_INVALID_INPUT', message: '請提供 email 和 password' } },
        { status: 400 },
      );
    }

    // Look up user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    // Compare password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    // Set session cookie
    await createSession(user.id, user.email);

    return Response.json({ userId: user.id, email: user.email });
  } catch (error) {
    console.error('[login] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
