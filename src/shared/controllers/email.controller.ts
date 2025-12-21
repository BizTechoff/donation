import { Allow, BackendMethod } from 'remult';
import { EmailRequest, EmailResponse } from '../email.type';

export class EmailController {
  @BackendMethod({ allowed: Allow.authenticated })
  static async sendBlessingRequestEmail(
    donorEmail: string,
    donorName: string,
    campaignName: string,
    blessingId: string
  ): Promise<EmailResponse> {
    const subject = `בקשה לברכה לספר ברכות - ${campaignName}`;

    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
        <h2 style="color: #2c3e50; text-align: center;">שלום ${donorName},</h2>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          אנו שמחים לפנות אליך במסגרת <strong>${campaignName}</strong>.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          נשמח אם תוכל לשלוח לנו ברכה אישית שתיכלל בספר הברכות המיוחד שלנו.
        </p>

        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          הברכה יכולה לכלול מילות תודה, ברכות לעתיד, או כל מסר אישי שתרצה לשתף.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 16px; color: #7f8c8d;">
            אנא השב לאימייל זה עם הברכה שלך, ואנחנו נדאג להכליל אותה בספר הברכות.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #7f8c8d; font-size: 14px; text-align: center;">
            תודה על שיתוף הפעולה והמשך הצלחה!
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #95a5a6; text-align: center;">
          אימייל זה נשלח אוטומטית מפלטפורמת ניהול התרומות
        </p>
      </div>
    `;

    const emailRequest: EmailRequest = {
      emails: [donorEmail],
      subject,
      html
    };

    return await EmailController.sendCustomEmail(emailRequest);
  }

  @BackendMethod({ allowed: Allow.authenticated })
  static async sendCustomEmail(
    emailRequest: EmailRequest
  ): Promise<EmailResponse> {
    return {} as EmailResponse
    // This code only runs on the backend
    // Use dynamic require to avoid webpack bundling
    // const { doSendEmail } = require('../../server/email');
    // return await doSendEmail(emailRequest);
  }
}
