export interface ImageInput {
  base64: string;
  mime: string;
}

export interface GenerateInput {
  modelImage: ImageInput;
  topImage: ImageInput;
  bottomImage: ImageInput;
  prompt: string;
}

export interface GenerateOutput {
  base64: string;
  mime: string;
  tokens: number;
}

export interface ImageProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
