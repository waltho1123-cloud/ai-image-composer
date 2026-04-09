import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateImage, validatePrompt } from '@/lib/validation';
import { errorResponse, AppError } from '@/lib/errors';
import type { ErrorCode } from '@/lib/errors';

const DAILY_QUOTA = 20;

// POST /api/v1/jobs -- Create a new job
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getSession();
    if (!session) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    // Parse multipart/form-data
    const formData = await request.formData();
    const modelImage = formData.get('modelImage') as File | null;
    const topImage = formData.get('topImage') as File | null;
    const bottomImage = formData.get('bottomImage') as File | null;
    const prompt = formData.get('prompt') as string | null;

    if (!modelImage || !topImage || !bottomImage || !prompt) {
      return Response.json(
        { error: { code: 'ERR_INVALID_INPUT', message: '請提供模特照、上身衣服照、下身衣服照和指令' } },
        { status: 400 },
      );
    }

    // Validate inputs (throws AppError on failure)
    validateImage(modelImage);
    validateImage(topImage);
    validateImage(bottomImage);

    // Validate total size <= 30MB
    const totalSize = modelImage.size + topImage.size + bottomImage.size;
    if (totalSize > 30 * 1024 * 1024) {
      return Response.json(
        { error: { code: 'ERR_INVALID_INPUT', message: '三張圖片總大小不可超過 30MB' } },
        { status: 400 },
      );
    }

    validatePrompt(prompt);

    // Check daily quota (read-only check first)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingQuota = await prisma.quotaLog.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date: today,
        },
      },
    });

    if (existingQuota && existingQuota.count >= DAILY_QUOTA) {
      return errorResponse('ERR_QUOTA_EXCEEDED' as ErrorCode);
    }

    // Convert images to base64 in parallel
    const [modelBuf, topBuf, bottomBuf] = await Promise.all([
      modelImage.arrayBuffer(),
      topImage.arrayBuffer(),
      bottomImage.arrayBuffer(),
    ]);
    const modelImageBase64 = Buffer.from(modelBuf).toString('base64');
    const topImageBase64 = Buffer.from(topBuf).toString('base64');
    const bottomImageBase64 = Buffer.from(bottomBuf).toString('base64');

    // Create Job record and increment quota atomically
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const [job] = await prisma.$transaction([
      prisma.job.create({
        data: {
          userId: session.userId,
          prompt: prompt.trim(),
          modelImageBase64,
          modelImageMime: modelImage.type,
          topImageBase64,
          topImageMime: topImage.type,
          bottomImageBase64,
          bottomImageMime: bottomImage.type,
          status: 'QUEUED',
          expiresAt,
        },
      }),
      prisma.quotaLog.upsert({
        where: {
          userId_date: {
            userId: session.userId,
            date: today,
          },
        },
        create: {
          userId: session.userId,
          date: today,
          count: 1,
        },
        update: {
          count: { increment: 1 },
        },
      }),
    ]);

    return Response.json(
      {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        estimatedSeconds: 25,
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code);
    }
    console.error('[POST /api/v1/jobs] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}

// GET /api/v1/jobs -- List user's jobs (last 7 days)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse('ERR_UNAUTHORIZED' as ErrorCode);
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
    const skip = (page - 1) * limit;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          userId: session.userId,
          createdAt: { gte: sevenDaysAgo },
        },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.job.count({
        where: {
          userId: session.userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return Response.json({ jobs, total, page, limit });
  } catch (error) {
    console.error('[GET /api/v1/jobs] Error:', error);
    return errorResponse('ERR_INTERNAL' as ErrorCode);
  }
}
