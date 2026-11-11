import { randomBytes } from 'crypto'
import { Request, Response, Router } from 'express'
import { LetterController } from '../shared/controllers/letter.controller'

/**
 * שלב ג׳ 5.5 - "פתיחת המכתב ישירות לעריכה והדפסה, בלי הורדה".
 *
 * המכתב שהופק נשמר כאן בזיכרון, ל-10 דקות, תחת מפתח אקראי, ונפתח ב-Word
 * דרך ms-word:ofe|u|<url>. בלי S3 ובלי אחסון: אין עותק של מכתב (שם, כתובת,
 * סכום, קבלה) שנשאר. Word לא שולח את עוגיית הדפדפן - ההגנה היא המפתח האקראי
 * והתוקף הקצר, כמו קישור חתום.
 *
 * Word שולח לפני ההורדה OPTIONS / HEAD (ולפעמים PROPFIND של WebDAV):
 * OPTIONS - 200, HEAD - נענה מ-GET (Express), כל השאר - 405, ואז Word פותח
 * את הקובץ כרגיל (עריכה, שמירה בשם, הדפסה).
 */

const TTL_MS = 10 * 60 * 1000
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

interface StoredLetter {
  buffer: Buffer
  fileName: string
  expires: number
}

const store = new Map<string, StoredLetter>()

function sweep() {
  const now = Date.now()
  for (const [token, letter] of store) if (letter.expires < now) store.delete(token)
}

/** שומר מכתב ומחזיר את הנתיב שלו (יחסי - הקליינט משלים לכתובת מלאה). */
export function storeLetterForWord(buffer: Buffer, fileName: string): string {
  sweep()
  const token = randomBytes(24).toString('hex')
  store.set(token, { buffer, fileName, expires: Date.now() + TTL_MS })
  return `/api/letter-open/${token}/${encodeURIComponent(fileName)}`
}

LetterController.storeForWordDelegate = async (base64: string, fileName: string) =>
  storeLetterForWord(Buffer.from(base64, 'base64'), fileName)
console.info('storeForWordDelegate succesfuly registered.')

const ALLOW = 'GET, HEAD, OPTIONS'

export const letterOpenRouter = Router()

letterOpenRouter.options('/:token/:name', (_req: Request, res: Response) => {
  res.set('Allow', ALLOW).sendStatus(200)
})

letterOpenRouter.get('/:token/:name', (req: Request, res: Response) => {
  sweep()
  const letter = store.get(req.params['token'])
  if (!letter) return res.sendStatus(404)
  res.set({
    'Content-Type': DOCX_MIME,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(letter.fileName)}`,
    'Cache-Control': 'no-store'
  })
  return res.send(letter.buffer)
})

letterOpenRouter.all('/:token/:name', (_req: Request, res: Response) => {
  res.set('Allow', ALLOW).sendStatus(405)
})
