import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '@/lib/errors';
import type { GenerateInput, GenerateOutput, ImageProvider } from './types';

const MODEL_NAME = 'gemini-2.5-flash-image';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Retry on rate limit, server errors, or network issues
    if (msg.includes('429') || msg.includes('500') || msg.includes('503')) {
      return true;
    }
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnreset')) {
      return true;
    }
  }
  return false;
}

function buildTryOnPrompt(userPrompt: string): string {
  const base = `You are a professional virtual try-on system. You have been given three images:

1. IMAGE 1: A full-body photo of a model/person
2. IMAGE 2: An upper-body garment (shirt, blouse, jacket, t-shirt, etc.)
3. IMAGE 3: A lower-body garment (pants, skirt, shorts, etc.)

Your task: Generate a single photorealistic image of the same model/person wearing the exact garments from images 2 and 3.

Requirements:
- Preserve the model's face, body proportions, skin tone, hairstyle, and pose exactly
- The garments must look naturally worn -- correct draping, wrinkles, shadows, and fit
- Maintain the garment colors, patterns, textures, and details precisely as shown
- Ensure proper garment-to-body alignment with realistic perspective
- Preserve lighting consistency across the entire image
- The output should look like a real photograph, not a collage

Output a single photorealistic image.`;

  if (userPrompt.trim()) {
    return `${base}\n\nAdditional instructions from the user: ${userPrompt.trim()}`;
  }
  return base;
}

export class GeminiProvider implements ImageProvider {
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        // @ts-expect-error -- responseModalities is supported by the API but not yet typed in the SDK
        responseModalities: ['Text', 'Image'],
      },
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const systemPrompt = buildTryOnPrompt(input.prompt);

        const result = await model.generateContent([
          { inlineData: { mimeType: input.modelImage.mime, data: input.modelImage.base64 } },
          { inlineData: { mimeType: input.topImage.mime, data: input.topImage.base64 } },
          { inlineData: { mimeType: input.bottomImage.mime, data: input.bottomImage.base64 } },
          { text: systemPrompt },
        ]);

        const response = result.response;

        // Check for blocked content
        if (response.promptFeedback?.blockReason) {
          throw new AppError('ERR_GEMINI_BLOCKED');
        }

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          throw new AppError('ERR_NO_IMAGE_RETURNED');
        }

        // Check if candidate was blocked
        const candidate = candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new AppError('ERR_GEMINI_BLOCKED');
        }

        // Extract image part from response
        const parts = candidate.content?.parts;
        if (!parts) {
          throw new AppError('ERR_NO_IMAGE_RETURNED');
        }

        const imagePart = parts.find(
          (p) => p.inlineData?.mimeType?.startsWith('image/'),
        );

        if (!imagePart?.inlineData) {
          throw new AppError('ERR_NO_IMAGE_RETURNED');
        }

        const tokens =
          (response.usageMetadata?.promptTokenCount ?? 0) +
          (response.usageMetadata?.candidatesTokenCount ?? 0);

        return {
          base64: imagePart.inlineData.data,
          mime: imagePart.inlineData.mimeType,
          tokens,
        };
      } catch (error) {
        // Do not retry AppErrors (business logic errors)
        if (error instanceof AppError) {
          throw error;
        }

        lastError = error;

        if (attempt < MAX_RETRIES && isRetryable(error)) {
          // Exponential backoff: 1s, 2s (GD-01)
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        break;
      }
    }

    // If we exhausted retries, wrap as API error
    console.error('[GeminiProvider] All retries failed:', lastError);
    throw new AppError('ERR_GEMINI_API_ERROR');
  }
}
