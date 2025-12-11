const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, Header, Footer, PageNumber, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

async function createTemplate() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // 0.5 inch
            bottom: 720,
            left: 720,
            right: 720,
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "בס\"ד", font: "David", size: 24, rightToLeft: true }),
              ],
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "עמוד ", font: "David", size: 20, rightToLeft: true }),
                new TextRun({ children: [PageNumber.CURRENT], font: "David", size: 20 }),
                new TextRun({ text: " מתוך ", font: "David", size: 20, rightToLeft: true }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "David", size: 20 }),
              ],
              alignment: AlignmentType.CENTER,
              bidirectional: true,
            }),
          ],
        }),
      },
      children: [
        // Date row
        new Paragraph({
          children: [
            new TextRun({ text: "{תאריך_לועזי}", font: "David", size: 24, rightToLeft: true }),
          ],
          alignment: AlignmentType.LEFT,
          bidirectional: true,
          spacing: { after: 200 },
        }),

        // לכבוד
        new Paragraph({
          children: [
            new TextRun({ text: "לכבוד", font: "David", size: 24, rightToLeft: true }),
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 100 },
        }),

        // שם תורם עברית
        new Paragraph({
          children: [
            new TextRun({ text: "{שם_תורם_עברית}", font: "David", size: 24, bold: true, rightToLeft: true }),
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { after: 100 },
        }),

        // To
        new Paragraph({
          children: [
            new TextRun({ text: "To", font: "Arial", size: 24 }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
        }),

        // שם תורם אנגלית
        new Paragraph({
          children: [
            new TextRun({ text: "{שם_תורם_אנגלית}", font: "Arial", size: 24, bold: true }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
        }),

        // כתובת רחוב
        new Paragraph({
          children: [
            new TextRun({ text: "{כתובת_רחוב}", font: "Arial", size: 24 }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
        }),

        // כתובת עיר
        new Paragraph({
          children: [
            new TextRun({ text: "{כתובת_עיר}", font: "Arial", size: 24 }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 },
        }),

        // כותרת הדוח
        new Paragraph({
          children: [
            new TextRun({ text: "להלן פירוט התרומות של מע\"כ לישיבתנו הק'", font: "David", size: 32, bold: true, rightToLeft: true }),
          ],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
        }),

        // טווח תאריכים
        new Paragraph({
          children: [
            new TextRun({ text: "מתאריך: {מתאריך}          עד: {עד_תאריך}", font: "David", size: 24, rightToLeft: true }),
          ],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 400 },
        }),

        // טבלת תרומות
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Header row
            new TableRow({
              tableHeader: true,
              children: [
                createHeaderCell("הערות"),
                createHeaderCell("סכום"),
                createHeaderCell("התחייבות"),
                createHeaderCell("תאריך עברי"),
                createHeaderCell("תאריך"),
              ],
            }),
            // Template row (will be duplicated for each donation)
            new TableRow({
              children: [
                createDataCell("{הערות}"),
                createDataCell("{סכום}"),
                createDataCell("{התחייבות}"),
                createDataCell("{תאריך_עברי}"),
                createDataCell("{תאריך}"),
              ],
            }),
          ],
        }),

        // רווח
        new Paragraph({
          children: [],
          spacing: { after: 600 },
        }),

        // בכבוד רב
        new Paragraph({
          children: [
            new TextRun({ text: "בכבוד רב ובתודה", font: "David", size: 28, bold: true, rightToLeft: true }),
          ],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
        }),

        // שם חותם
        new Paragraph({
          children: [
            new TextRun({ text: "{שם_חותם}", font: "David", size: 24, rightToLeft: true }),
          ],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'report-template.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Template created: ${outputPath}`);
}

function createHeaderCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, font: "David", size: 22, bold: true, rightToLeft: true }),
        ],
        alignment: AlignmentType.CENTER,
        bidirectional: true,
      }),
    ],
    shading: { fill: "f0f0f0" },
  });
}

function createDataCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, font: "David", size: 22, rightToLeft: true }),
        ],
        alignment: AlignmentType.CENTER,
        bidirectional: true,
      }),
    ],
  });
}

createTemplate().catch(console.error);
