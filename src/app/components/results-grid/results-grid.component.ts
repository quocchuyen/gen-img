import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageGenerationResult } from '../../models/image-generation.model';
import { AspectRatio } from '../../../services/gemini.service';
import JSZip from 'jszip';
import saveAs from 'file-saver';


@Component({
  selector: 'app-results-grid',
  templateUrl: './results-grid.component.html',
  imports: [CommonModule],
})
export class ResultsGridComponent {
  results = input.required<ImageGenerationResult[]>();
  aspectRatio = input.required<AspectRatio>();

  isZipping = signal<boolean>(false);

  hasSuccessfulImages = computed(() => this.results().some(r => r.status === 'success' && r.images && r.images.length > 0));

  downloadImage(imageB64: string, prompt: string, index: number): void {
    if (!imageB64) return;

    const sanitizedPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const filename = `${sanitizedPrompt || 'generated_image'}_${index + 1}.jpeg`;

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
    } finally {
      this.isZipping.set(false);
    }
  }
}
