import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

interface SessionPayload {
  userId: string;
  email: string;
  exp: number; // expiry timestamp in seconds
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return secret;
}

function sign(payload: string): string {
  const hmac = createHmac('sha256', getSecret());
  hmac.update(payload);
  return hmac.digest('base64url');
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const signature = sign(data);
  return `${data}.${signature}`;
}

function decode(cookie: string): SessionPayload | null {
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;

  const expected = sign(data);
  const sigBuf = Buffer.from(signature, 'utf-8');
  const expBuf = Buffer.from(expected, 'utf-8');

  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const json = Buffer.from(data, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.userId || !payload.email) return null;

    // Check expiry
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const payload = decode(cookie.value);
  if (!payload) return null;
  return { userId: payload.userId, email: payload.email };
}

export async function createSession(
  userId: string,
  email: string,
): Promise<void> {
  const cookieStore = await cookies();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = encode({ userId, email, exp });
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
