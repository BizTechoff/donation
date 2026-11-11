import { Injectable } from '@angular/core';
import { LetterController } from '../../shared/controllers/letter.controller';
import { DocxCreateResponse } from '../../shared/type/letter.type';
import { GlobalFilterService } from './global-filter.service';
import { Letter } from '../../shared/enum/letter';
import { DOCX_MIME, dataUrlToBlob, downloadBlob } from '../common/file-utils';

@Injectable({
  providedIn: 'root'
})
export class LetterService {

  constructor(private globalFilterService: GlobalFilterService) { }

  async createLetter(donationId = '', type: Letter, fieldValues: { [key: string]: string }, prefix = [] as string[], suffix = [] as string[], recipientDonorId = ''): Promise<DocxCreateResponse> {
    const response = await LetterController.createLetter(donationId, type, fieldValues, prefix, suffix, recipientDonorId);

    if (response.success && response.url) {
      const fileName = response.fileName || `${type.caption}.docx`;
      try {
        downloadBlob(dataUrlToBlob(response.url, DOCX_MIME), fileName);
      } catch (error) {
        console.error('Error downloading file:', error);
        throw new Error('Failed to download file');
      }
    }

    return response;
  }

}
