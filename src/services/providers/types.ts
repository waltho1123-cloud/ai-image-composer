export interface ImageInput {
  base64: string;
  mime: string;
}

export type OutputSize = 'auto' | '2048x2048' | '2048x1152' | '3840x2160' | '2160x3840';
export type OutputQuality = 'auto' | 'low' | 'medium' | 'high';
export type OutputFormat = 'png' | 'jpeg' | 'webp';

export interface GenerateInput {
  modelImage: ImageInput;
  topImage: ImageInput;
  bottomImage: ImageInput;
  prompt: string;
  size?: OutputSize;
  quality?: OutputQuality;
  format?: OutputFormat;
}

export interface GenerateOutput {
  base64: string;
  mime: string;
  tokens: number;
}

export interface ImageProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
