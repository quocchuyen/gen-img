import { ImageModel, AspectRatio } from '../../services/gemini.service';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ImageGenerationResult {
  prompt: string;
  status: GenerationStatus;
  images?: string[]; // base64 image strings
  error?: string;
}

export interface ImageModelOption {
  label: string;
  value: ImageModel;
}

export interface GenerationConfig {
  prompts: string;
  aspectRatio: AspectRatio;
  numberOfImages: number;
  stylePreset: string;
  model: ImageModel;
}

export const STYLE_PRESETS = [
  { label: 'None (Raw Prompt)', value: '' },
  { label: 'Photorealistic (DSLR)', value: 'photorealistic, 8k, highly detailed, shot on DSLR, realistic lighting, sharp focus' },
  { label: 'Vintage Illustration', value: 'vintage hand-drawn illustration, retro style, ink and paper texture, nostalgic aesthetic' },
  { label: 'Oil Painting', value: 'oil painting style, textured canvas, impasto brushstrokes, classical art' },
  { label: 'Cinematic', value: 'cinematic lighting, movie scene, dramatic atmosphere, 4k, anamorphic lens' },
  { label: 'Anime/Manga', value: 'anime style, vibrant colors, studio ghibli inspired, 2D cel shaded' },
  { label: '3D Render', value: '3D render, blender, octane render, unreal engine 5, ray tracing' },
  { label: 'Digital Art', value: 'digital art, concept art, trending on artstation, clean lines' },
  { label: 'Watercolor', value: 'watercolor painting, soft edges, artistic, bleeding colors, wet-on-wet' },
];

export const IMAGE_MODELS: ImageModelOption[] = [
    { label: 'Gemini 2.5 Flash (Recommended)', value: 'gemini-2.5-flash-image' },
    { label: 'Gemini 3 Pro Image', value: 'gemini-3-pro-image-preview' },
    { label: 'Imagen 4.0 (Recommended)', value: 'imagen-4.0-generate-001' },
    { label: 'Imagen 3.0', value: 'imagen-3.0-generate-001' },
];

export const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
