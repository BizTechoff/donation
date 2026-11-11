import { Injectable } from '@angular/core';
import { remult } from 'remult';
import { LetterController } from '../../shared/controllers/letter.controller';
import { CustomLetter, DonationFile } from '../../shared/entity';
import { DocxCreateResponse } from '../../shared/type/letter.type';
import { GlobalFilterService } from './global-filter.service';
import { Letter } from '../../shared/enum/letter';
import { customIdOf, duplicateCaption, loadLetterCatalog } from '../../shared/utils/letter-catalog';
import { DOCX_MIME, dataUrlToBlob, downloadBlob } from '../common/file-utils';
import { FileUploadService } from './file-upload.service';

@Injectable({
  providedIn: 'root'
})
export class LetterService {

  constructor(private globalFilterService: GlobalFilterService, private fileUpload: FileUploadService) { }

  async createLetter(donationId = '', type: Letter, fieldValues: { [key: string]: string }, prefix = [] as string[], suffix = [] as string[], recipientDonorId = ''): Promise<DocxCreateResponse> {
    const response = await LetterController.createLetter(donationId, type.id, fieldValues, prefix, suffix, recipientDonorId); // שלב ג׳ 5.4 - לפי id

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

  // ── שלב ג׳ 5.4 - ניהול המכתבים ותבניותיהם ──────────────────────────────

  /** כל המכתבים: המובנים ואלה שנוספו (shared/utils/letter-catalog). */
  loadCatalog(): Promise<Letter[]> {
    return loadLetterCatalog();
  }

  /** התבנית שהועלתה ובתוקף, לכל מכתב שיש לו כזו (letterId -> הקובץ האחרון). */
  async uploadedTemplates(): Promise<Map<string, DonationFile>> {
    const files = await remult.repo(DonationFile).find({
      where: { letterId: { $ne: '' }, isActive: true },
      orderBy: { createdDate: 'desc' }
    });
    const map = new Map<string, DonationFile>();
    for (const f of files) if (!map.has(f.letterId)) map.set(f.letterId, f);
    return map;
  }

  /** התבנית שבתוקף (שהועלתה או המובנית), לעריכה ב-Word. */
  async downloadTemplate(letter: Letter): Promise<void> {
    const { fileName, base64 } = await LetterController.downloadTemplate(letter.id);
    downloadBlob(dataUrlToBlob(`data:${DOCX_MIME};base64,${base64}`, DOCX_MIME), fileName);
  }

  /** העלאת נוסח. הבדיקה בשרת - תבנית שגויה נדחית עם הסבר, והקודמת נשארת. */
  async uploadTemplate(letter: Letter, file: File): Promise<void> {
    const result = await this.fileUpload.uploadFile(file, '', '', letter.caption, undefined, letter.id);
    if (!result.success) throw new Error(result.error || 'ההעלאה נכשלה');
  }

  /** חזרה לתבנית המקורית - התבניות שהועלו נשארות כהיסטוריה, לא פעילות. */
  async restoreTemplate(letter: Letter): Promise<void> {
    const repo = remult.repo(DonationFile);
    for (const f of await repo.find({ where: { letterId: letter.id, isActive: true } })) {
      f.isActive = false;
      await repo.save(f);
    }
  }

  /** מכתב חדש כשכפול: אותה קטגוריה, אותם שדות; התבנית - של הבסיס עד שתועלה. */
  async duplicate(base: Letter, name: string): Promise<void> {
    await remult.repo(CustomLetter).insert({
      caption: duplicateCaption(base, name),
      baseLetterId: base.baseId || base.id
    });
  }

  /** הסתרת מכתב שנוסף (לא נמחק). */
  async hide(letter: Letter): Promise<void> {
    const id = customIdOf(letter.id);
    if (!id) return;
    const repo = remult.repo(CustomLetter);
    const row = await repo.findId(id);
    if (!row) return;
    row.isActive = false;
    await repo.save(row);
  }
}
