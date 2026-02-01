import { Component, ChangeDetectionStrategy, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AspectRatio, ImageModel } from '../../../services/gemini.service';
import { GenerationConfig, STYLE_PRESETS, IMAGE_MODELS, ASPECT_RATIOS, ImageModelOption } from '../../models/image-generation.model';

@Component({
  selector: 'app-generation-form',
  templateUrl: './generation-form.component.html',
  imports: [CommonModule],
})
export class GenerationFormComponent {
  isLoading = input.required<boolean>();
  generate = output<GenerationConfig>();

  readonly stylePresets = STYLE_PRESETS;
  readonly imageModels: ImageModelOption[] = IMAGE_MODELS;
  readonly aspectRatios: AspectRatio[] = ASPECT_RATIOS;

  prompts = signal<string>('A photorealistic portrait of a pensive android in a neon-lit alley.\nA majestic fantasy castle perched on a floating island at sunrise.\nA cute, fluffy red panda enjoying a bowl of ramen noodles.');
  aspectRatio = signal<AspectRatio>('1:1');
  numberOfImages = signal<number>(1);
  stylePreset = signal<string>('');
  model = signal<ImageModel>('imagen-4.0-generate-001');

  onNumberOfImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.valueAsNumber;
    if (isNaN(value)) {
      this.numberOfImages.set(1);
      return;
    }
    const clampedValue = Math.max(1, Math.min(4, value));
    this.numberOfImages.set(clampedValue);
  }

  handleFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    if (file.type !== 'text/plain') {
      console.error("Invalid file type. Please upload a .txt file.");
      target.value = ''; // Reset the input
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      if (content) {
        this.prompts.set(content);
      }
    };
    
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
    };

    reader.readAsText(file);
    
    // Reset the input value so the same file can be re-uploaded after changes
    target.value = '';
  }

  submitGeneration(): void {
    if (!this.prompts().trim()) {
      return;
    }
    this.generate.emit({
      prompts: this.prompts(),
      aspectRatio: this.aspectRatio(),
      numberOfImages: this.numberOfImages(),
      stylePreset: this.stylePreset(),
      model: this.model(),
    });
  }
}
