import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import * as path from 'path';

const isProduction = process.env['NODE_ENV'] === "production";

// Define fonts path based on environment
const fontsBase = isProduction
    ? path.resolve(process.cwd(), 'dist/donation/browser/assets/fonts')
    : path.resolve(process.cwd(), 'src/assets/fonts');
console.log('fontsBase', fontsBase)
const fonts = {
    Alef: {
        normal: path.join(fontsBase, 'Alef', 'Alef-Regular.ttf'),
        bold: path.join(fontsBase, 'Alef', 'Alef-Bold.ttf'),
        italics: path.join(fontsBase, 'Alef', 'Alef-Regular.ttf'),
        bolditalics: path.join(fontsBase, 'Alef', 'Alef-Bold.ttf')
    },
    David: {
        normal: path.join(fontsBase, 'David_Libre', 'DavidLibre-Regular.ttf'),
        bold: path.join(fontsBase, 'David_Libre', 'DavidLibre-Bold.ttf'),
        italics: path.join(fontsBase, 'David_Libre', 'DavidLibre-Regular.ttf'),
        bolditalics: path.join(fontsBase, 'David_Libre', 'DavidLibre-Bold.ttf')
    }
};

const printer = new PdfPrinter(fonts);

export interface PersonalDonorReportData {
    donorNameHebrew: string;
    donorNameEnglish: string;
    fullAddress: string;
    fromDate: string;
    toDate: string;
    donations: Array<{
        date: string;
        dateHebrew: string;
        commitment: string;
        amount: string;
        notes: string;
    }>;
}

/**
 * Creates a PDF for personal donor report
 * @param data - The report data
 * @returns Promise<Buffer> - PDF as buffer
 */
export async function createPersonalDonorReportPdf(data: PersonalDonorReportData): Promise<Buffer> {
    const tableBody: Content[][] = [
        // Header row
        [
            { text: 'הערות', style: 'tableHeader', alignment: 'right' },
            { text: 'סכום', style: 'tableHeader', alignment: 'right' },
            { text: 'התחייבות', style: 'tableHeader', alignment: 'right' },
            { text: 'תאריך עברי', style: 'tableHeader', alignment: 'right' },
            { text: 'תאריך', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    // Add donation rows
    for (const donation of data.donations) {
        tableBody.push([
            { text: donation.notes || '', alignment: 'right' },
            { text: donation.amount || '', alignment: 'right' },
            { text: donation.commitment || '', alignment: 'right' },
            { text: donation.dateHebrew || '', alignment: 'right' },
            { text: donation.date || '', alignment: 'right' }
        ]);
    }

    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 60, 40, 60],

        content: [
            // Header
            {
                text: 'דוח תרומות אישי',
                style: 'header',
                alignment: 'center',
                margin: [0, 0, 0, 20]
            },

            // Donor info
            {
                columns: [
                    {
                        width: '*',
                        text: [
                            { text: 'שם התורם: ', bold: true },
                            { text: data.donorNameHebrew }
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 0, 0, 5]
            },
            {
                columns: [
                    {
                        width: '*',
                        text: [
                            { text: 'Name: ', bold: true },
                            { text: data.donorNameEnglish }
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 0, 0, 5]
            },
            {
                columns: [
                    {
                        width: '*',
                        text: [
                            { text: 'כתובת: ', bold: true },
                            { text: data.fullAddress }
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 0, 0, 5]
            },
            {
                columns: [
                    {
                        width: '*',
                        text: [
                            { text: 'תקופה: ', bold: true },
                            { text: `${data.fromDate} - ${data.toDate}` }
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 0, 0, 20]
            },

            // Donations table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: {
                    hLineWidth: function (i: number, node: any) {
                        return (i === 0 || i === node.table.body.length) ? 2 : 1;
                    },
                    vLineWidth: function () {
                        return 1;
                    },
                    hLineColor: function (i: number, node: any) {
                        return (i === 0 || i === node.table.body.length) ? '#333333' : '#999999';
                    },
                    vLineColor: function () {
                        return '#999999';
                    },
                    paddingLeft: function () { return 8; },
                    paddingRight: function () { return 8; },
                    paddingTop: function () { return 6; },
                    paddingBottom: function () { return 6; }
                }
            }
        ],

        styles: {
            header: {
                fontSize: 22,
                bold: true
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                fillColor: '#eeeeee'
            }
        },

        defaultStyle: {
            font: 'David',
            fontSize: 10
        }
    };

    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];

            pdfDoc.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            pdfDoc.on('end', () => {
                const result = Buffer.concat(chunks);
                resolve(result);
            });

            pdfDoc.on('error', (error: Error) => {
                reject(error);
            });

            pdfDoc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Creates a PDF and returns it as base64 data URL
 * @param data - The report data
 * @returns Promise<string> - PDF as base64 data URL
 */
export async function createPersonalDonorReportPdfBase64(data: PersonalDonorReportData): Promise<string> {
    const buffer = await createPersonalDonorReportPdf(data);
    const base64 = buffer.toString('base64');
    return `data:application/pdf;base64,${base64}`;
}
