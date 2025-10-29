import { Injectable } from '@angular/core';
import { LetterController } from '../../shared/controllers/letter.controller';
import { DocxCreateResponse } from '../../shared/type/letter.type';
import { GlobalFilterService } from './global-filter.service';
import { Letter } from '../../shared/enum/letter';

@Injectable({
  providedIn: 'root'
})
export class LetterService {

  constructor(private globalFilterService: GlobalFilterService) { }

  async createLetter(donationId = '', type: Letter, fieldValues: { [key: string]: string }, prefix = [] as string[], suffix = [] as string[]): Promise<DocxCreateResponse> {
    const response = await LetterController.createLetter(donationId, type, fieldValues, prefix, suffix);

    // If successful, trigger automatic download
    if (response.success && response.url) {
      this.downloadFile(response.url, response.fileName || `${type.caption}.docx`);
    }

    return response;
  }

  /**
   * Downloads a file from a data URL using Blob
   * @param dataUrl The base64 data URL
   * @param fileName The desired filename
   */
  private downloadFile(dataUrl: string, fileName: string): void {
    try {
      // Convert base64 data URL to Blob
      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create blob URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file');
    }
  }

}
