/**
 * אפשרויות docxtemplater - מקום אחד לכל הפקת מסמך מתבנית, ולבדיקת תבנית
 * שהועלתה (server/letter-templates) - כך שמה שעובר בדיקה הוא בדיוק מה שמופק.
 * nullGetter: שדה שלא נשלח (למשל תואר מלא או סיומת מכתב שלא נבחרו) יוצא ריק.
 * ברירת המחדל של הספרייה כותבת במקומו את המילה "undefined" בתוך המכתב.
 */
export const DOCX_TEMPLATE_OPTIONS = {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
}

/** תיקיית התבניות המובנות (assets/letters, assets/reports). */
export function assetsDir(kind: 'letters' | 'reports'): string {
    // In production: /app/dist/donation/browser/assets/<kind>
    // In dev: relative to project root
    const path = require('path')
    return process.env['NODE_ENV'] === 'production'
        ? path.resolve(process.cwd(), `dist/donation/browser/assets/${kind}`)
        : path.resolve(__dirname, `../assets/${kind}`)
}
