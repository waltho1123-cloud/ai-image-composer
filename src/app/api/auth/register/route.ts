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

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: { code: 'ERR_EMAIL_TAKEN', message: '此 email 已被註冊' } },
        { status: 409 },
      );
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Set session cookie
    await createSession(user.id, user.email);

    return Response.json(
      { userId: user.id, email: user.email },
      { status: 201 },
    );
  } catch (error) {
    console.error('[register] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
