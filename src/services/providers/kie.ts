import { AppError } from '@/lib/errors';
import type { GenerateInput, GenerateOutput, ImageInput, ImageProvider } from './types';

const API_BASE = 'https://api.kie.ai';
const MODEL = 'gpt-image-2-image-to-image';
const UPLOAD_PATH = 'ai-image-composer';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error('KIE_API_KEY is not set');
  return key;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return /429|500|502|503|504|network|timeout|econnreset|fetch failed/.test(m);
  }
  return false;
}

interface UploadResponse {
  code: number;
  msg?: string;
  data?: { downloadUrl: string };
}

async function uploadImage(img: ImageInput, apiKey: string, label: string): Promise<string> {
  const ext = img.mime.split('/')[1] || 'png';
  const fileName = `${label}-${Date.now()}.${ext}`;
  const res = await fetch(`${API_BASE}/api/file-base64-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      base64Data: `data:${img.mime};base64,${img.base64}`,
      uploadPath: UPLOAD_PATH,
      fileName,
    }),
  });
  if (!res.ok) {
    throw new Error(`upload ${label} failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as UploadResponse;
  if (json.code !== 200 || !json.data?.downloadUrl) {
    throw new Error(`upload ${label} bad response: ${JSON.stringify(json)}`);
  }
  return json.data.downloadUrl;
}

interface CreateTaskResponse {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

async function createTask(urls: string[], prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt,
        input_urls: urls,
        aspect_ratio: 'auto',
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`createTask failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as CreateTaskResponse;
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(`createTask bad response: ${JSON.stringify(json)}`);
  }
  return json.data.taskId;
}

interface RecordInfoResponse {
  code: number;
  data?: {
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  };
}

async function pollTask(taskId: string, apiKey: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${API_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`recordInfo failed: ${res.status}`);
    }
    const json = (await res.json()) as RecordInfoResponse;
    const state = json.data?.state;
    if (state === 'success') {
      const parsed = JSON.parse(json.data!.resultJson || '{}') as { resultUrls?: string[] };
      const url = parsed.resultUrls?.[0];
      if (!url) throw new AppError('ERR_NO_IMAGE_RETURNED');
      return url;
    }
    if (state === 'fail') {
      const msg = json.data?.failMsg || '';
      if (/safety|moderation|block/i.test(msg)) {
        throw new AppError('ERR_GEMINI_BLOCKED');
      }
      throw new Error(`task failed: ${json.data?.failCode} ${msg}`);
    }
  }
  throw new Error('task polling timeout');
}

async function fetchAsBase64(url: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download result failed: ${res.status}`);
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), mime };
}

function buildPrompt(userPrompt: string): string {
  const base = `Virtual try-on. Three input images in order:
1) the model/person (full-body photo)
2) an upper-body garment
3) a lower-body garment

Generate a single photorealistic image of the same person from image 1 wearing the garment from image 2 on the upper body and the garment from image 3 on the lower body.

Requirements:
- Preserve face, body proportions, skin tone, hairstyle, and pose from image 1.
- Garment colors, patterns, textures and details must match images 2 and 3 exactly.
- Natural draping, wrinkles, shadows, fit; consistent lighting.
- Output must look like a real photograph, not a collage.`;
  return userPrompt.trim() ? `${base}\n\nAdditional user instructions: ${userPrompt.trim()}` : base;
}

export class KieProvider implements ImageProvider {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const apiKey = getApiKey();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [modelUrl, topUrl, bottomUrl] = await Promise.all([
          uploadImage(input.modelImage, apiKey, 'model'),
          uploadImage(input.topImage, apiKey, 'top'),
          uploadImage(input.bottomImage, apiKey, 'bottom'),
        ]);

        const taskId = await createTask([modelUrl, topUrl, bottomUrl], buildPrompt(input.prompt), apiKey);
        const resultUrl = await pollTask(taskId, apiKey);
        const { base64, mime } = await fetchAsBase64(resultUrl);

        return { base64, mime, tokens: 0 };
      } catch (error) {
        if (error instanceof AppError) throw error;
        lastError = error;
        if (attempt < MAX_RETRIES && isRetryable(error)) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        break;
      }
    }

    console.error('[KieProvider] All retries failed:', lastError);
    throw new AppError('ERR_GEMINI_API_ERROR');
  }
}
