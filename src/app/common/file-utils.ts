/**
 * file-utils.ts - קבצים שהשרת מחזיר כ-data URL (base64): המרה ל-Blob והורדה.
 * מקום אחד - מכתבים, דוחות וכל מה שמוריד קובץ שנוצר בשרת.
 */

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** "data:<mime>;base64,<data>" -> Blob. mime ברירת מחדל - מתוך ה-URL עצמו. */
export function dataUrlToBlob(dataUrl: string, mime?: string): Blob {
  const [head, data] = dataUrl.split(',')
  const type = mime || head.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream'
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type })
}

/** הורדת Blob כקובץ בשם הנתון. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
