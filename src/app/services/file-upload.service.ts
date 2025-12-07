import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { remult } from 'remult';
import { firstValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FileController, FileUploadData, UploadUrlResponse } from '../../shared/controllers/file.controller';
import { DonationFile } from '../../shared/entity/file';

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(private http: HttpClient) { }

  /**
   * Upload a file to S3 and save metadata in DB
   * @param file - The file to upload
   * @param donationId - The donation ID (optional if certificateId provided)
   * @param certificateId - The certificate ID (optional if donationId provided)
   * @param description - Optional description
   * @param onProgress - Optional callback for progress updates
   */
  async uploadFile(
    file: File,
    donationId: string,
    certificateId: string,
    description?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // Step 1: Get upload URL from backend
      const fileData: FileUploadData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        donationId: donationId || undefined,
        certificateId: certificateId || undefined,
        description: description
      };

      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        });
      }

      const urlResponse: UploadUrlResponse = await FileController.getUploadUrl(fileData);

      if (!urlResponse.success || !urlResponse.url) {
        throw new Error(urlResponse.error || 'Failed to get upload URL');
      }

      // Step 2: Upload file directly to S3 using the signed URL
      // Important: We must send the same Content-Type that was used to generate the signature
      const uploadHeaders = new HttpHeaders({
        'Content-Type': urlResponse.contentType || file.type
      });

      // Upload to S3 and wait for completion
      const uploadRequest = this.http.put(urlResponse.url, file, {
        headers: uploadHeaders,
        reportProgress: true,
        observe: 'events'
      }).pipe(
        map(event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            if (onProgress) {
              onProgress({
                fileName: file.name,
                progress: progress,
                status: 'uploading'
              });
            }
          } else if (event.type === HttpEventType.Response) {
            if (onProgress) {
              onProgress({
                fileName: file.name,
                progress: 100,
                status: 'completed'
              });
            }
          }
          return event;
        }),
        filter(event => event.type === HttpEventType.Response)
      );

      await firstValueFrom(uploadRequest);

      const fileS3Link = urlResponse.url.split('?')[0]

      // Create file metadata in database
      const fileRepo = remult.repo(DonationFile);
      const fileEntity = fileRepo.create({
        fileName: fileData.fileName,
        filePath: fileS3Link,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        donationId: fileData.donationId || '',
        certificateId: fileData.certificateId || '',
        description: fileData.description,
        isActive: true,
        uploadedById: remult.user?.id
      });

      await fileRepo.save(fileEntity);

      console.log('File uploaded successfully to S3:', file.name);

      return {
        success: true,
        fileId: urlResponse.fileId
      };

    } catch (error) {
      console.error('Error uploading file:', error);

      if (onProgress) {
        onProgress({
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: File[],
    donationId: string,
    certificateId: string,
    description?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; uploadedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let uploadedCount = 0;

    for (const file of files) {
      const result = await this.uploadFile(file, donationId, certificateId, description, onProgress);
      if (result.success) {
        uploadedCount++;
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      uploadedCount,
      errors
    };
  }

  /**
   * Get all files for a donation
   */
  async getFilesByDonation(donationId: string): Promise<DonationFile[]> {
    return await FileController.getFilesByDonation(donationId);
  }

  /**
   * Get all files for a certificate
   */
  async getFilesByCertificate(certificateId: string): Promise<DonationFile[]> {
    return await FileController.getFilesByCertificate(certificateId);
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileId: string): Promise<string | null> {
    try {
      const response = await FileController.getDownloadUrl(fileId);
      return response.success ? response.url : null;
    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string, fileName: string): Promise<void> {
    try {
      const url = await this.getDownloadUrl(fileId);
      if (!url) {
        throw new Error('Failed to get download URL');
      }
// alert(url)
      window?.open(url, '_blank')

      // Open in new window or download
      // const link = document.createElement('a');
      // link.href = url;
      // link.target = '_blank';
      // link.download = fileName;
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await FileController.deleteFile(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'picture_as_pdf';
    if (fileType.startsWith('video/')) return 'videocam';
    if (fileType.startsWith('audio/')) return 'audiotrack';
    if (fileType.includes('word') || fileType.includes('document')) return 'description';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'table_chart';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'slideshow';
    if (fileType.includes('zip') || fileType.includes('compressed')) return 'folder_zip';
    return 'insert_drive_file';
  }
}
