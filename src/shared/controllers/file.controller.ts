import { Allow, BackendMethod, remult } from 'remult';
import { DonationFile } from '../entity/file';
import { parseS3FilePath, sanitizeS3FileName } from '../utils/file-name-utils';

export interface UploadUrlResponse {
  success: boolean;
  url: string;
  error?: string;
  fileId?: string;
  contentType?: string;
  /**
   * סעיף 7 - ה-S3 key שנחתם. הקליינט שומר אותו כמות שהוא ב-filePath במקום
   * להסיק אותו מה-URL החתום: רק הצד הזה בונה מפתח, ושני הצדדים קוראים את
   * אותו ערך. ההסקה מה-URL היא שהחזירה AccessDenied בפתיחת קובץ.
   */
  key?: string;
}

export interface FileUploadData {
  fileName: string;
  fileType: string;
  fileSize: number;
  donationId?: string;
  certificateId?: string;
  description?: string;
}

export class FileController {


  static generateUploadURLDelegate: (action: string, fileName: string, fileType: string, bucketKey: string) => Promise<{ success: boolean, url: string, error: string }>

  /**
   * Step 1: Get a signed URL for uploading to S3
   * Returns: signed URL + creates file metadata in DB
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getUploadUrl(fileData: FileUploadData): Promise<UploadUrlResponse> {
    try {
      const { fileName, fileType, fileSize, donationId, certificateId, description } = fileData;

      // Generate unique filename to avoid collisions
      // סעיף 7 - השם עובר נרמול לפני שהוא הופך ל-S3 key (הפונקציה האחת של
      // הפלטפורמה לשמות קבצים). "/" במיוחד - הוא מפריד תיקיות במפתח.
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${sanitizeS3FileName(fileName)}`;

      // Determine bucket key based on whether it's for a donation or certificate
      let bucketKey: string;
      if (donationId) {
        bucketKey = `donations/${donationId}`;
      } else if (certificateId) {
        bucketKey = `certificates/${certificateId}`;
      } else {
        return {
          success: false,
          url: '',
          error: 'Either donationId or certificateId must be provided'
        };
      }

      // Get signed URL from S3
      const s3Result = await FileController.generateUploadURLDelegate('putObject', uniqueFileName, fileType, bucketKey);

      if (!s3Result.success || !s3Result.url) {
        return {
          success: false,
          url: '',
          error: s3Result.error || 'Failed to generate upload URL'
        };
      }

      return {
        success: true,
        url: s3Result.url,
        fileId: timestamp + '',
        contentType: fileType,
        key: `${bucketKey}/${uniqueFileName}`
      };
    } catch (error) {
      console.error('Error in getUploadUrl:', error);
      return {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get download URL for a file
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDownloadUrl(fileId: string): Promise<UploadUrlResponse> {
    try {
      const fileRepo = remult.repo(DonationFile);
      const file = await fileRepo.findId(fileId);

      if (!file) {
        return {
          success: false,
          url: '',
          error: 'File not found'
        };
      }

      // סעיף 7 - פירוק filePath דרך הפונקציה המשותפת, שקוראת גם את הפורמט
      // הנוכחי ("donations/{donationId}/{uniqueFileName}") וגם URL מלא שנשמר
      // בעבר. הפירוק הקודם היה split('/') ישיר, ולכן bucketKey כלל את
      // הפרוטוקול והדומיין ו-fileName נשאר מקודד באחוזים - המפתח שנחתם להורדה
      // לא הצביע על שום אובייקט, ובבאקט פרטי בלי ListBucket זה חוזר כ-
      // AccessDenied ולא כ-NoSuchKey.
      const { bucketKey, fileName: uniqueFileName } = parseS3FilePath(file.filePath);


      // Get signed URL from S3
      const s3Result = await FileController.generateUploadURLDelegate('getObject', uniqueFileName, file.fileType, bucketKey);

      if (!s3Result.success || !s3Result.url) {
        return {
          success: false,
          url: '',
          error: s3Result.error || 'Failed to generate download URL'
        };
      }

      /*
      https://donation-yyg.s3.eu-central-1.amazonaws.com/https%3A//donation-yyg.s3.eu-central-1.amazonaws.com/certificates/2c6bc3b7-a8f2-4154-9b45-5939b971ea61/1765138261998_60022.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA24G2HKROT44MS6JE%2F20251207%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20251207T201859Z&X-Amz-Expires=1800&X-Amz-Signature=eb48d81c1cb153d6ac53828835c716e202e7236b6f6154a76fc6e82541aaf02e&X-Amz-SignedHeaders=host
      
      */
      const part1 = s3Result.url.split('?')[0]
      const part2 = part1.split('//')[part1.split('//').length - 1]
      const url = 'https://' + part2
      // const url = 'https://' + s3Result.url.split('?')[0].split('//')[0] //.replace(process.env['S3_BUCKET_URL']!, '').replace('https%3A//', 'https//')

      return {
        success: true,
        url: url,
        fileId: file.id
      };
    } catch (error) {
      console.error('Error in getDownloadUrl:', error);
      return {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all files for a donation
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getFilesByDonation(donationId: string): Promise<DonationFile[]> {
    const fileRepo = remult.repo(DonationFile);
    return await fileRepo.find({
      where: { donationId: donationId, isActive: true },
      orderBy: { createdDate: 'desc' },
      include: { uploadedBy: true }
    });
  }

  /**
   * Get all files for a certificate
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getFilesByCertificate(certificateId: string): Promise<DonationFile[]> {
    const fileRepo = remult.repo(DonationFile);
    return await fileRepo.find({
      where: { certificateId: certificateId, isActive: true },
      orderBy: { createdDate: 'desc' },
      include: { uploadedBy: true }
    });
  }

  /**
   * Delete a file (soft delete - sets isActive to false)
   */
  @BackendMethod({ allowed: Allow.authenticated })
  static async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fileRepo = remult.repo(DonationFile);
      const file = await fileRepo.findId(fileId);

      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Soft delete
      file.isActive = false;
      await fileRepo.save(file);

      // Note: We're not actually deleting from S3 for safety
      // In production, you might want to add a hard delete option or cleanup job

      return { success: true };
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
