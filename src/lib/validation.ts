import { AppError } from '@/lib/errors';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PROMPT_LENGTH = 1000;

export function validateImage(file: File): void {
  if (!ALLOWED_MIMES.has(file.type)) {
    throw new AppError('ERR_INVALID_MIME');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('ERR_FILE_TOO_LARGE');
  }
}

export function validatePrompt(prompt: string): void {
  const trimmed = prompt.trim();
  // Use spread to count Unicode characters correctly (GD-08)
  if (trimmed.length === 0 || [...trimmed].length > MAX_PROMPT_LENGTH) {
    throw new AppError('ERR_PROMPT_TOO_LONG');
  }
}
