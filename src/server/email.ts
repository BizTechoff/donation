import { config } from "dotenv";
import { NextFunction, Request, Response } from "express";
import nodemailer from 'nodemailer';
import { EmailController } from "../shared/controllers/email.controller";
import { EmailRequest, EmailResponse } from "../shared/email.type";

config()

//https://myaccount.google.com/apppasswords
//https://myaccount.google.com/signinoptions/two-step-verification

const isProduction = process.env['NODE_ENV'] === "production";
console.log('email.ts.isProduction: ', isProduction)
// const CLIENT_ID = process.env['EMAIL_CLIENT_ID'];
// const CLIENT_SECRET = process.env['EMAIL_CLIENT_SECRET'];
// const REDIRECT_URI = process.env['EMAIL_REDIRECT_URI'] // 'https://developers.google.com/oauthplayground' | 'http://localhost'
// const REFRESH_TOKEN = process.env['EMAIL_REFRESH_TOKEN'];
// const EMAIL_SENDER = process.env['EMAIL_SENDER']
// const ACCESS_TOKEN = process.env['EMAIL_ACCESS_TOKEN']
// const SCOPES = ['https://www.googleapis.com/auth/gmail.send']

// const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
// oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

EmailController.sendEmailDelegate = async (req: EmailRequest) => await doSendEmail(req)
console.info('sendEmailDelegate succesfuly registered.')


export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    console.log('sendEmail called')
    const result: EmailResponse = { success: false, errorCode: 400, errorText: '' }
    try {
        const key = req.query['key'] as string
        if (key === process.env['SERVER_API_KEY']!) {
            const emailRequest = req.body as EmailRequest;
            if (emailRequest) {
                const response = await doSendEmail(emailRequest)
                result.errorCode = response.errorCode
                result.errorText = response.errorText
                result.success = response.success
            } else {
                result.errorText = 'email request NOT-FUND'
                console.error(result.errorText)
            }
        } else {
            result.errorText = 'email key NOT-FUND'
            console.error(result.errorText)
        }
    } catch (error) {
        result.errorText = `Error: ${error}, `
        console.error(result.errorText)
    }
    return res.status(result.errorCode).json(result);
}


export const doSendEmail = async (req: EmailRequest) => {
    console.log('sendEmail called')
    const result: EmailResponse = { success: false, errorCode: 400, errorText: '' }

    const open = process.env['EMAIL_CHANNEL_OPENED'] === 'true'
    if (open) {
        try {
            if (req) {
                if (!req.emails) {
                    req.emails = [] as string[]
                }
                if(!req.emails.length){
                    result.errorText = 'No emails founds.'
                    console.error(result.errorText)
                    return result
                }
                if (!req.html) {
                    req.html = ''
                }
                if (!req.html.trim().startsWith('<div')) {
                    req.html = `<div dir="rtl" lang="he">${req.html}</div>`
                }
                // console.log('req', JSON.stringify(req))
                // console.log('EMAIL_SENDER', EMAIL_SENDER)
                // console.log('CLIENT_ID', CLIENT_ID)
                // console.log('CLIENT_SECRET', CLIENT_SECRET)
                // console.log('REFRESH_TOKEN', REFRESH_TOKEN)
                // console.log('ACCESS_TOKEN', ACCESS_TOKEN)

                if (req.emails.length) {
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        secure: true,
                        auth: {
                            user: process.env['EMAIL_SENDER'],
                            pass: process.env['EMAIL_APP_PASSWORD']
                        }
                        // service: 'gmail',
                        // auth: {
                        //     // type: 'OAuth2',
                        //     user: EMAIL_SENDER,
                        //     clientId: CLIENT_ID,
                        //     clientSecret: CLIENT_SECRET,
                        //     refreshToken: REFRESH_TOKEN,
                        //     accessToken: ACCESS_TOKEN
                        // }
                    });

                    const mailOptions = {
                        from: process.env['EMAIL_SENDER'],
                        to: isProduction ? req.emails : 'biztechoff.app@gmail.com',
                        // to: isProduction ? req.emails.join(';') : 'biztechoff.app@gmail.com',
                        // to: isProduction ? 'legaltaxi.app@gmail.com' : 'biztechoff.app@gmail.com',
                        subject: `${req.subject}` + (isProduction ? `` : ` (${req.emails.join(';')})`),
                        html: req.html,
                    };

                    console.log('going to send email', isProduction, JSON.stringify(mailOptions))
                    const response = await transporter.sendMail(mailOptions);
                    console.log('Email sent:', response);
                    result.success = true;
                    result.errorCode = 200;
                } else {
                    result.errorText = 'email recipents NOT-FUND'
                    console.error(result.errorText)
                }
            } else {
                result.errorText = 'email request NOT-FUND'
                console.error(result.errorText)
            }
        } catch (error) {
            result.errorText = `Error: ${error}, `
            console.error(result.errorText)
        }
    } else {
        result.errorText = 'email channel NOT-OPENED'
        console.error(result.errorText)
    }
    return result;
}
