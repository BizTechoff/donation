import Docxtemplater from 'docxtemplater'
import * as fs from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import { remult } from 'remult'
import { FileController } from '../shared/controllers/file.controller'
import { LetterController } from '../shared/controllers/letter.controller'
import { DonationFile } from '../shared/entity/file'
import { Letter } from '../shared/enum/letter'
import { findLetter } from '../shared/utils/letter-catalog'
import { assetsDir, DOCX_TEMPLATE_OPTIONS } from './docx-options'

/**
 * שלב ג׳ 5.4 - תבניות המכתבים: איזו תבנית בתוקף, ובדיקת תבנית שהועלתה.
 *
 * תבנית שהלקוח העלה היא קובץ במודול הקבצים (DonationFile.letterId, ב-S3).
 * הסדר: הקובץ הפעיל האחרון של המכתב -> של מכתב הבסיס (מכתב שנוסף) ->
 * התבנית המובנית ב-assets.
 */

LetterController.validateTemplateDelegate = async (letterId: string, key: string) => await validateTemplate(letterId, key)
console.info('validateTemplateDelegate succesfuly registered.')
LetterController.readTemplateDelegate = async (letterId: string) => {
  const letter = await findLetter(letterId)
  if (!letter) throw new Error('המכתב לא נמצא')
  return (await readTemplate(letter)).toString('base64')
}
console.info('readTemplateDelegate succesfuly registered.')

/** קבצים מ-S3 לפי key. ה-key כולל חותמת זמן ולא משתנה - נקרא פעם אחת. */
const s3Cache = new Map<string, Buffer>()

async function readS3(key: string): Promise<Buffer> {
  if (!s3Cache.has(key)) s3Cache.set(key, await FileController.readFileDelegate(key))
  return s3Cache.get(key)!
}

/** התבנית שבתוקף למכתב. */
export async function readTemplate(letter: Letter): Promise<Buffer> {
  for (const id of [letter.id, letter.baseId].filter((x): x is string => !!x)) {
    const file = await remult.repo(DonationFile).findFirst(
      { letterId: id, isActive: true },
      { orderBy: { createdDate: 'desc' } }
    )
    if (file) return await readS3(file.filePath)
  }
  return fs.readFileSync(path.join(assetsDir('letters'), letter.templatePath))
}

/**
 * תבנית שהועלתה - לפני שהיא נכנסת (DonationFile.saving). נכשלת אם:
 * - docxtemplater לא מצליח לקמפל אותה (למשל "{Amount" בלי סוגר);
 * - יש בה {שדה} שאינו משדות המכתב (למשל {Amont}).
 */
export async function validateTemplate(letterId: string, key: string): Promise<void> {
  const letter = await findLetter(letterId)
  if (!letter) throw new Error('המכתב לא נמצא')

  let text: string
  try {
    text = new Docxtemplater(new PizZip(await readS3(key)), DOCX_TEMPLATE_OPTIONS).getFullText()
  } catch (err: any) {
    const details = (err?.properties?.errors || [err])
      .map((e: any) => e?.properties?.explanation || e?.message)
      .filter(Boolean)
      .join('; ')
    throw new Error(`התבנית לא תקינה: ${details}`)
  }

  const allowed = new Set([...letter.fields, 'letter_prefix', 'letter_suffix'])
  const tags = [...text.matchAll(/\{([^{}]+)\}/g)].map(m => m[1].trim())
  const unknown = [...new Set(tags.filter(t => !allowed.has(t)))]
  if (unknown.length) {
    throw new Error(`שדות לא מוכרים בתבנית: ${unknown.map(t => `{${t}}`).join(', ')}. השדות של המכתב: ${letter.fields.map(f => `{${f}}`).join(', ')}`)
  }
}
