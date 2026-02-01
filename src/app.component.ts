import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, AspectRatio } from './services/gemini.service';
import { GenerationConfig, ImageGenerationResult } from './app/models/image-generation.model';
import { GenerationFormComponent } from './app/components/generation-form/generation-form.component';
import { QueueProgressComponent } from './app/components/queue-progress/queue-progress.component';
import { ResultsGridComponent } from './app/components/results-grid/results-grid.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GenerationFormComponent,
    QueueProgressComponent,
    ResultsGridComponent,
  ]
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  results = signal<ImageGenerationResult[]>([]);
  isLoading = signal<boolean>(false);
  
  // Aspect ratio is needed by the results grid to set the correct container size
  aspectRatio = signal<AspectRatio>('1:1');

  // Queue state signals
  totalQueueCount = signal<number>(0);
  completedQueueCount = signal<number>(0);
  currentPromptIndex = signal<number>(0);


  async generateImages(config: GenerationConfig): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.aspectRatio.set(config.aspectRatio); // Store for results grid
    const promptsToProcess = config.prompts.trim().split('\n').filter(p => p.trim() !== '');
    
    // Initialize queue state
    this.totalQueueCount.set(promptsToProcess.length);
    this.completedQueueCount.set(0);
    this.currentPromptIndex.set(0);

    // Initialize results with loading state
    this.results.set(promptsToProcess.map(prompt => ({
      prompt,
      status: 'loading'
    })));

    // Process prompts sequentially
    for (let i = 0; i < promptsToProcess.length; i++) {
      this.currentPromptIndex.set(i + 1);
      const prompt = promptsToProcess[i];
      try {
        const finalPrompt = config.stylePreset ? `${prompt}, ${config.stylePreset}` : prompt;

        const imageB64s = await this.geminiService.generateImage(
          finalPrompt, 
          config.aspectRatio, 
          config.numberOfImages,
          config.model
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
}
