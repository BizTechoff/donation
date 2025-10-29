import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DonationFile } from '../../../shared/entity/file';
import { UIToolsService } from '../../common/UIToolsService';
import { FileUploadService, UploadProgress } from '../../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  @Input() donationId?: string;
  @Input() certificateId?: string;
  @Input() allowMultiple = true;
  @Input() acceptedTypes = 'image/*,.pdf';
  @Input() maxFileSize = 10 * 1024 * 1024; // 10MB default

  @Output() filesChanged = new EventEmitter<DonationFile[]>();
  @Output() uploadStarted = new EventEmitter<void>();
  @Output() uploadCompleted = new EventEmitter<void>();

  files: DonationFile[] = [];
  uploading = false;
  uploadProgress: { [fileName: string]: UploadProgress } = {};

  constructor(private fileUploadService: FileUploadService, private ui: UIToolsService) { }

  async ngOnInit() {
    if (this.donationId) {
      await this.loadFiles();
    } else if (this.certificateId) {
      await this.loadFilesByCertificate();
    }
  }

  async loadFiles() {
    try {
      this.files = await this.fileUploadService.getFilesByDonation(this.donationId!);
      this.filesChanged.emit(this.files);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  async loadFilesByCertificate() {
    try {
      this.files = await this.fileUploadService.getFilesByCertificate(this.certificateId!);
      this.filesChanged.emit(this.files);
    } catch (error) {
      console.error('Error loading certificate files:', error);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(Array.from(input.files));
    }
    // Reset input value to allow re-uploading the same file
    input.value = '';
  }

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.acceptedTypes;
    input.multiple = this.allowMultiple;

    input.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        this.uploadFiles(Array.from(files));
      }
    };

    input.click();
  }

  async uploadFiles(files: File[]) {
    if (!this.donationId && !this.certificateId) {
      alert('לא ניתן להעלות קבצים ללא תרומה או תעודה קיימת');
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > this.maxFileSize);
    if (oversizedFiles.length > 0) {
      alert(`הקבצים הבאים גדולים מדי (מקסימום ${this.fileUploadService.formatFileSize(this.maxFileSize)}):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

    this.uploading = true;
    this.uploadStarted.emit();

    const errors = [] as string[]
    for (const file of files) {
      this.uploadProgress[file.name] = {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      };

      await this.fileUploadService.uploadFile(
        file,
        this.donationId || '',
        this.certificateId || '',
        undefined,
        (progress) => {
          if (progress.error) {
            errors.push(progress.error)
          }
          else {
            this.uploadProgress[file.name] = progress;
          }
        }
      );
    }

    // Reload files list
    if (this.donationId) {
      await this.loadFiles();
    } else if (this.certificateId) {
      await this.loadFilesByCertificate();
    }

    this.uploading = false;
    this.uploadProgress = {};
    this.uploadCompleted.emit();

    if (errors?.length) {
      this.ui.error(errors.join('\n'))
    }
  }

  async downloadFile(file: DonationFile) {
    try {
      await this.fileUploadService.downloadFile(file.id, file.fileName);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('שגיאה בהורדת הקובץ');
    }
  }

  async deleteFile(file: DonationFile) {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${file.fileName}?`)) {
      return;
    }

    try {
      const result = await this.fileUploadService.deleteFile(file.id);
      if (result.success) {
        if (this.donationId) {
          await this.loadFiles();
        } else if (this.certificateId) {
          await this.loadFilesByCertificate();
        }
      } else {
        alert('שגיאה במחיקת הקובץ: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('שגיאה במחיקת הקובץ');
    }
  }

  getFileIcon(file: DonationFile): string {
    return this.fileUploadService.getFileIcon(file.fileType);
  }

  formatFileSize(bytes: number): string {
    return this.fileUploadService.formatFileSize(bytes);
  }

  getUploadingFiles(): string[] {
    return Object.keys(this.uploadProgress);
  }
}
