import { Injectable } from '@angular/core';
import { GoogleGenAI } from "@google/genai";

// Declare process to avoid TypeScript errors for process.env
declare const process: any;

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type ImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' |'imagen-3.0-generate-001' | 'imagen-4.0-generate-001';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateImage(
    prompt: string, 
    aspectRatio: AspectRatio, 
    numberOfImages: number,
    model: ImageModel
  ): Promise<string[]> {
    try {
      // Handle Gemini models (e.g., gemini-2.5-flash-image) which use generateContent
    if (model.toLowerCase().startsWith('gemini')) {
      const response = await this.ai.models.generateContent({
        model: model,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      // Find the image part. Do not assume it is the first part.
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (part && part.inlineData && part.inlineData.data) {
        // Wrap the single string in an array to match the return type string[]
        return [`data:image/png;base64,${part.inlineData.data}`];
      }
      
      throw new Error("No image content generated. The model might have returned only text.");
    } 
    // Handle Imagen models (e.g., imagen-3.0-generate-001) which use generateImages
    else {
      const config = {
        numberOfImages: numberOfImages,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      };

      const response = await this.ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: config,
      });
      
      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
      } else {
        throw new Error('No images were generated.');
      }
    }
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`API Error: ${errorMessage}`);
    }
  }
}