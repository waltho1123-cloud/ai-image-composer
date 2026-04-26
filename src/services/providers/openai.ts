import { AppError } from '@/lib/errors';
import type { GenerateInput, GenerateOutput, ImageInput, ImageProvider } from './types';

const API_URL = 'https://api.openai.com/v1/images/edits';
const MODEL = 'gpt-image-2';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 5 * 60 * 1000;

function getApiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY is not set');
  return k;
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

function toBlob(img: ImageInput): Blob {
  const buf = Buffer.from(img.base64, 'base64');
  return new Blob([new Uint8Array(buf)], { type: img.mime });
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
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

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  usage?: { total_tokens?: number };
  error?: { message?: string; code?: string; type?: string };
}

export class OpenAIProvider implements ImageProvider {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const apiKey = getApiKey();
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const form = new FormData();
        form.append('model', MODEL);
        form.append('prompt', buildPrompt(input.prompt));
        form.append('n', '1');
        form.append('size', input.size ?? 'auto');
        form.append('quality', input.quality ?? 'auto');
        const fmt = input.format ?? 'png';
        form.append('output_format', fmt);

        const imgs: Array<[string, ImageInput]> = [
          ['model', input.modelImage],
          ['top', input.topImage],
          ['bottom', input.bottomImage],
        ];
        for (const [label, img] of imgs) {
          form.append('image[]', toBlob(img), `${label}.${extFromMime(img.mime)}`);
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const json = (await res.json()) as OpenAIImageResponse;

        if (!res.ok) {
          const msg = json.error?.message || res.statusText;
          const code = json.error?.code || '';
          if (/safety|content_policy|moderation/i.test(`${code} ${msg}`)) {
            throw new AppError('ERR_GEMINI_BLOCKED');
          }
          throw new Error(`${res.status} ${msg}`);
        }

        const item = json.data?.[0];
        if (!item) throw new AppError('ERR_NO_IMAGE_RETURNED');

        let base64: string;
        let mime = `image/${fmt === 'jpeg' ? 'jpeg' : fmt}`;
        if (item.b64_json) {
          base64 = item.b64_json;
        } else if (item.url) {
          const r = await fetch(item.url);
          if (!r.ok) throw new Error(`download result failed: ${r.status}`);
          mime = r.headers.get('content-type')?.split(';')[0] || 'image/png';
          base64 = Buffer.from(await r.arrayBuffer()).toString('base64');
        } else {
          throw new AppError('ERR_NO_IMAGE_RETURNED');
        }

        return { base64, mime, tokens: json.usage?.total_tokens ?? 0 };
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

    console.error('[OpenAIProvider] All retries failed:', lastError);
    throw new AppError('ERR_GEMINI_API_ERROR');
  }
}
