import { config } from "dotenv";
import { NextFunction, Request, Response } from "express";
import { FileController } from "../shared/controllers/file.controller";


FileController.generateUploadURLDelegate = async (action: string, fileName: string, fileType: string, bucketKey: string) => await doGenerateSignedURL(action, fileName, fileType, bucketKey)

console.info('generateUploadURLDelegate succesfuly registered.')
config()

const s3Client = async () => {
    let result = undefined
    // if (process.env['S3_CHANNEL_OPENED'] === 'true') {
    const region = process.env['S3_BUCKET_REGION']!
    const accessKeyId = process.env['S3_BUCKET_ACCESS_KEY_ID']!
    const secretAccessKey = process.env['S3_BUCKET_SECRET_ACCESS_KEY']!

    const aws = require('aws-sdk')
    // aws.config.logger = console;
    result = new aws.S3({
        region,
        accessKeyId,
        secretAccessKey,
        signatureVersion: 'v4'
    })
    // }
    // else {
    //     console.debug('s3Client.error: aws-S3 Channel is Closed!!');
    // }
    return result
}

export const generateUploadURL = async (req: Request, res: Response, next: NextFunction) => {

    let result = { success: false, url: '', error: '' }
    const action = 'putObject'
    console.debug('generateUploadURL called at ' + new Date().toString())

    const key = req.query['key'] as string
    if (key === process.env['SERVER_API_KEY']!) {
        var { fileName, fileType, bucketKey } = req.body
        console.log('s3-sign-file: bucketKey: ', fileName, fileType, bucketKey, req.body);
        if (!bucketKey?.trim().length) {
            bucketKey = 'casual'
        }
        if (bucketKey && bucketKey.length > 0) {
            result = await doGenerateSignedURL(action, fileName, fileType, bucketKey)
        } else {
            result.error = 'bucketKey missing'
            console.error(result.error)
        }
    } else {
        result.error = 'key missing'
        console.error(result.error)
    }
    console.log('aws-23-generateUploadURL-result', result)
    const status = result.error?.trim().length ? 500 : 200
    return res.status(status).json(result)
}

// תיקון 1: עדכן את doGenerateSignedURL - זמנים שונים לפעולות שונות
export const doGenerateSignedURL = async (action: string, fileName: string, fileType: string, bucketKey: string) => {
    let result = { success: false, url: '', error: '' }

    const open = process.env['S3_CHANNEL_OPENED'] === 'true'
    if (open) {
        const s3 = await s3Client()
        if (s3) {
            // ✅ זמנים שונים לפעולות שונות
            // Note: For putObject, we include ContentType in the signature
            const params: any = {
                Bucket: process.env['S3_BUCKET_NAME']!,
                Key: bucketKey ? `${bucketKey}/${fileName}` : `${fileName}`,
                Expires: action === 'putObject' ? 120 : 1800
            };

            // Add ContentType for putObject to ensure proper file handling
            if (action === 'putObject' && fileType) {
                params.ContentType = fileType;
            }


            // var params1 = ({
            //     Bucket: process.env['S3_BUCKET_NAME']!,
            //     Key: bucketKey ? `${bucketKey}/${fileName}` : `${fileName}`,
            //     Expires: expires //, // ✅ זמן דינמי
            //     // ContentType: fileType, // MIME type of the file
            // })
            // // ✅ ContentType רק ל-putObject, לא ל-getObject
            // if (action === 'putObject') {
            //     params1 = ({
            //         Bucket: process.env['S3_BUCKET_NAME']!,
            //         Key: bucketKey ? `${bucketKey}/${fileName}` : `${fileName}`,
            //         Expires: expires, // ✅ זמן דינמי
            //         ContentType: fileType, // MIME type of the file
            //     })
            // }
            try {
                console.log('generateSignedURL.params', params, action)
                result.url = await s3.getSignedUrlPromise(action, params)
                result.success = true
            }
            catch (err) {
                result.error = 'generateSignedURL.error: ' + err?.toString()
                console.error(result.error)
            }
        }
        else {
            result.error = 's3 missing'
            console.error(result.error)
        }
    } else {
        result.error = 'Upload Channel is Closed!!'
        console.debug('s3Client.error: Upload Channel is Closed!!');
    }

    return result
}

// תיקון 2: עדכן את generateDownloadURL להיות GET endpoint
export const generateDownloadURL = async (req: Request, res: Response, next: NextFunction) => {
    let result = { success: false, url: '', error: '' }
    const action = 'getObject'
    console.debug('generateDownloadURL called at ' + new Date().toString())

    const key = req.query['key'] as string
    if (key === process.env['SERVER_API_KEY']!) {
        // ✅ קבל מ-query params במקום body (אם עושה GET)
        const fileName = req.query['fileName'] as string || req.body?.fileName;
        const bucketKey = req.query['bucketKey'] as string || req.body?.bucketKey || 'casual';
        const fileType = req.query['fileType'] as string || req.body?.fileType || '';

        console.log('s3-get-file:', fileName, bucketKey, fileType);

        if (fileName) {
            result = await doGenerateSignedURL(action, fileName, fileType, bucketKey)
        } else {
            result.error = 'fileName missing'
            console.error(result.error)
        }
    } else {
        result.error = 'key missing'
        console.error(result.error)
    }

    console.log('aws-generateDownloadURL-result', result)
    const status = result.error?.trim().length ? 500 : 200
    return res.status(status).json(result)
}

// export const doGenerateDownloadURL = async (action: string, fileName: string, bucketKey: string) => {
//     let result = { success: false, url: '', error: '' }

//     const open = process.env['S3_CHANNEL_OPENED'] === 'true'
//     if (open) {
//         const s3 = await s3Client()
//         if (s3) {
//             const params = ({
//                 Bucket: process.env['S3_BUCKET_NAME']!,
//                 Key: bucketKey ? `${bucketKey}/${fileName}` : `${fileName}`,
//                 Expires: 3600, // URL expiration - שעה (במקום 60 שניות להעלאה)
//             })
//             try {
//                 console.log('generateDownloadURL.params', params, action)
//                 result.url = await s3.getSignedUrlPromise(action, params)
//                 result.success = true
//             }
//             catch (err) {
//                 result.error = 'generateDownloadURL.error: ' + err?.toString()
//                 console.error(result.error)
//             }
//         }
//         else {
//             result.error = 's3 missing'
//             console.error(result.error)
//         }
//     } else {
//         result.error = 'aws-S3 Channel is Closed!!'
//         console.debug('s3Client.error: aws-S3 Channel is Closed!!');
//     }

//     return result
// }

// export const uploadFile = async (
//     buffer: Buffer,
//     fileName: string,
//     contentType: string,
//     bucketKey = ""
// ): Promise<string> => {
//     const s3 = await s3Client();
//     if (!s3) throw new Error("S3 is not initialized");

//     const fullKey = bucketKey ? `${bucketKey}/${fileName}` : fileName;

//     const params = {
//         Bucket: process.env['S3_BUCKET_NAME']!,
//         Key: fullKey,
//         Body: buffer,
//         ContentType: contentType,
//         ACL: "public-read", // או "private" אם אתה רוצה שהקובץ לא יהיה ציבורי
//     };

//     await s3.upload(params).promise();

//     // בונה URL לצפייה בקובץ
//     const url = `https://${process.env['S3_BUCKET_NAME']}.s3.${process.env['S3_BUCKET_REGION']}.amazonaws.com/${fullKey}`;
//     return url;
// };
