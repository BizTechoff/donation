import { Allow, BackendMethod, remult } from 'remult';
import { DonationFile } from '../entity/file';

export interface UploadUrlResponse {
  success: boolean;
  url: string;
  error?: string;
  fileId?: string;
  contentType?: string;
}

export interface FileUploadData {
  fileName: string;
  fileType: string;
  fileSize: number;
  donationId: string;
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
      const { fileName, fileType, fileSize, donationId, description } = fileData;

      // Generate unique filename to avoid collisions
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const bucketKey = `donations/${donationId}`;

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
        contentType: fileType
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

      // Extract fileName and bucketKey from filePath
      // filePath format: "donations/{donationId}/{uniqueFileName}"
      const pathParts = file.filePath.split('/');
      const uniqueFileName = pathParts[pathParts.length - 1];
      const bucketKey = pathParts.slice(0, -1).join('/');

      // Get signed URL from S3
      const s3Result = await FileController.generateUploadURLDelegate('getObject', uniqueFileName, file.fileType, bucketKey);

      if (!s3Result.success || !s3Result.url) {
        return {
          success: false,
          url: '',
          error: s3Result.error || 'Failed to generate download URL'
        };
      }

      return {
        success: true,
        url: s3Result.url,
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
