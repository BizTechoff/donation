export interface EmailRequest {
  emails: string[];
  subject: string;
  html: string;
  attachments?: string[];
}

export interface EmailResponse {
  success: boolean;
  errorCode: number;
  errorText: string;
}
