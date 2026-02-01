import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, AspectRatio, ImageModel } from './services/gemini.service';
import JSZip from 'jszip';
import saveAs from 'file-saver';


type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ImageGenerationResult {
  prompt: string;
  status: GenerationStatus;
  images?: string[]; // base64 image strings
  error?: string;
}

const STYLE_PRESETS = [
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

interface ImageModelOption {
  label: string;
  value: ImageModel;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  readonly STYLE_PRESETS = STYLE_PRESETS;

  prompts = signal<string>('A photorealistic portrait of a pensive android in a neon-lit alley.\nA majestic fantasy castle perched on a floating island at sunrise.\nA cute, fluffy red panda enjoying a bowl of ramen noodles.');
  aspectRatio = signal<AspectRatio>('1:1');
  numberOfImages = signal<number>(1);
  results = signal<ImageGenerationResult[]>([]);
  isLoading = signal<boolean>(false);
  isZipping = signal<boolean>(false);
  stylePreset = signal<string>('');
  model = signal<ImageModel>('gemini-2.5-flash-image');

  // Queue state signals
  totalQueueCount = signal<number>(0);
  completedQueueCount = signal<number>(0);
  currentPromptIndex = signal<number>(0);

  imageModels: ImageModelOption[] = [
    { label: 'Gemini 2.5 Flash (Recommended)', value: 'gemini-2.5-flash-image' },
    { label: 'Gemini 3 Pro Image', value: 'gemini-3-pro-image-preview' },
    { label: 'Imagen 4.0', value: 'imagen-4.0-generate-001' },
    { label: 'Imagen 3.0', value: 'imagen-3.0-generate-001' },
  ];

  hasSuccessfulImages = computed(() => this.results().some(r => r.status === 'success' && r.images && r.images.length > 0));
  progressPercentage = computed(() => {
    const total = this.totalQueueCount();
    if (total === 0) return 0;
    return (this.completedQueueCount() / total) * 100;
  });

  aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

  async generateImages(): Promise<void> {
    if (this.isLoading() || !this.prompts().trim()) {
      return;
    }

    this.isLoading.set(true);
    const promptsToProcess = this.prompts().trim().split('\n').filter(p => p.trim() !== '');
    
    // Initialize queue state
    this.totalQueueCount.set(promptsToProcess.length);
    this.completedQueueCount.set(0);
    this.currentPromptIndex.set(0);

    // Initialize results with loading state
    this.results.set(promptsToProcess.map(prompt => ({
      prompt,
      status: 'loading'
    })));

    // Read config values from signals before processing
    const aspectRatio = this.aspectRatio();
    const numberOfImages = this.numberOfImages();
    const stylePresetValue = this.stylePreset();
    const model = this.model();

    // Process prompts sequentially
    for (let i = 0; i < promptsToProcess.length; i++) {
      this.currentPromptIndex.set(i + 1);
      const prompt = promptsToProcess[i];
      try {
        const finalPrompt = stylePresetValue ? `${prompt}, ${stylePresetValue}` : prompt;

        const imageB64s = await this.geminiService.generateImage(
          finalPrompt, 
          aspectRatio, 
          numberOfImages,
          model
        );

        this.results.update(currentResults => {
          const newResults = [...currentResults];
          newResults[i] = { prompt: prompt, status: 'success', images: imageB64s };
          return newResults;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        this.results.update(currentResults => {
          const newResults = [...currentResults];
          newResults[i] = { prompt: prompt, status: 'error', error: errorMessage };
          return newResults;
        });
      } finally {
        this.completedQueueCount.update(c => c + 1);
      }

      // Add a delay after each request to avoid hitting rate limits, except for the last prompt.
      if (i < promptsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
      }
    }
    
    this.isLoading.set(false);
  }

  onNumberOfImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.valueAsNumber;

    if (isNaN(value)) {
      this.numberOfImages.set(1);
      return;
    }
    
    // Clamp the value between 1 and 4
    const clampedValue = Math.max(1, Math.min(4, value));
    this.numberOfImages.set(clampedValue);
  }

  downloadImage(imageB64: string, prompt: string, index: number): void {
    if (!imageB64) {
      return;
    }

    // Create a sanitized filename from the prompt
    const sanitizedPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove most special characters
      .replace(/\s+/g, '_') // replace spaces with underscores
      .substring(0, 50); // truncate to 50 chars for safety
    
    const filename = `${sanitizedPrompt || 'generated_image'}_${index + 1}.jpeg`;

    // Create a link and trigger the download
    const link = document.createElement('a');
    link.href = imageB64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async downloadAllAsZip(): Promise<void> {
    if (this.isZipping()) return;

    this.isZipping.set(true);
    try {
      const zip = new JSZip();
      const successfulResults = this.results().filter(r => r.status === 'success' && r.images && r.images.length > 0);

      for (const result of successfulResults) {
        if (!result.images) continue;

        for (let i = 0; i < result.images.length; i++) {
          const imageB64 = result.images[i];
          const base64Data = imageB64.split(',')[1];
          if (!base64Data) continue;

          const sanitizedPrompt = result.prompt
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
          
          const filename = `${sanitizedPrompt || 'generated_image'}_${i + 1}.jpeg`;
          
          zip.file(filename, base64Data, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'generated_images.zip');

    } catch (error) {
      console.error("Failed to create zip file:", error);
      // Optionally, update the UI to show an error to the user
    } finally {
      this.isZipping.set(false);
    }
  }
}
