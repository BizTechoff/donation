import { Component, EventEmitter, Input, Output } from '@angular/core'
import { Donation } from '../../../../../shared/entity'
import { FileUploadService, UploadProgress } from '../../../../services/file-upload.service'

@Component({
  selector: 'app-photo-capture-step',
  templateUrl: './photo-capture-step.component.html',
  styleUrls: ['./photo-capture-step.component.scss']
})
export class PhotoCaptureStepComponent {
  @Input() donation!: Donation
  @Output() photoComplete = new EventEmitter<void>()
  @Output() photoSkipped = new EventEmitter<void>()
  @Output() back = new EventEmitter<void>()

  previewUrl: string | null = null
  uploading = false
  uploadProgress = 0
  uploaded = false
  errorMessage = ''

  constructor(private fileUploadService: FileUploadService) { }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    this.errorMessage = ''

    // Show preview
    const reader = new FileReader()
    reader.onload = () => {
      this.previewUrl = reader.result as string
    }
    reader.readAsDataURL(file)

    this.uploadFile(file)
  }

  private async uploadFile(file: File) {
    this.uploading = true
    this.uploadProgress = 0
    this.uploaded = false

    try {
      const result = await this.fileUploadService.uploadFile(
        file,
        this.donation.id,
        '',
        'check photo',
        (progress: UploadProgress) => {
          this.uploadProgress = progress.progress
        }
      )

      if (result.success) {
        this.uploaded = true
      } else {
        this.errorMessage = result.error || 'שגיאה בהעלאת הקובץ'
      }
    } catch (err: any) {
      this.errorMessage = err?.message || 'שגיאה בהעלאת הקובץ'
    } finally {
      this.uploading = false
    }
  }

  retake() {
    this.previewUrl = null
    this.uploaded = false
    this.uploadProgress = 0
    this.errorMessage = ''
  }
}
