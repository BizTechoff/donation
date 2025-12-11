import Docxtemplater from "docxtemplater";
import { config } from "dotenv";
import * as fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { LetterController } from "../shared/controllers/letter.controller";
import { ReportController } from "../shared/controllers/report.controller";
import { Letter } from "../shared/enum/letter";
import { Report } from '../shared/enum/report';
import { DocxContentControl, DocxCreateResponse } from "../shared/type/letter.type";

config()

const isProduction = process.env['NODE_ENV'] === "production";


LetterController.createLetterDelegate = async (type: Letter, contents = [] as DocxContentControl[]) => await createLetterDocX(type, contents)
console.info('createLetterDelegate succesfuly registered.')
ReportController.createReportDelegate = async (report: Report, contents: Record<string, any>) => await createReportDocX(report, contents)
console.info('createReportDelegate succesfuly registered.')


export const createLetterDocX = async (type: Letter, contents = [] as DocxContentControl[]) => {

    var result: DocxCreateResponse = { success: false, url: '', error: '', fileName: '' }

    if (!contents) {
        contents = [] as DocxContentControl[]
    }

    const fullPath = path.resolve(__dirname, `../${isProduction ? 'donation/' : ''}assets/letters`, `${type.templatePath}`);//.docx`);
    console.log('fullPath', fullPath)

    var content = ''
    try {
        // Load the docx file as binary content
        content = fs.readFileSync(
            fullPath,
            "binary"
        );
    } catch (err) {
        result.error = 'fullPath.readed.error' + fullPath + " :: " + err
        console.error(result.error)
        return result
    }

    // Unzip the content of the file
    const zip = new PizZip(content);

    /*
     * Parse the template.
     * This function throws an error if the template is invalid,
     * for example, if the template is "Hello {user" (missing closing tag)
     */
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    /*
     * Render the document : Replaces :
     * - {first_name} with John
     * - {last_name} with Doe,
     * ...
     */
    const data = contents.reduce((acc, curr) => {
        acc[curr.name] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    doc.render(data);

    /*
     * Get the document as a zip (docx are zipped files)
     * and generate it as a Node.js buffer
     */
    const buf = doc.getZip().generate({
        type: "nodebuffer",
        // type: "nodebuffer",
        /*
         * Compression: DEFLATE adds a compression step.
         * For a 50MB document, expect 500ms additional CPU time.
         */
        compression: "DEFLATE",
    });

    // Convert buffer to base64 for client download
    const base64 = buf.toString('base64');
    const fileName = `${type.caption}.docx`;
    // const fileName = `${type.caption}_${new Date().getTime()}.docx`;

    result.success = true;
    result.url = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
    result.error = ''; // Clear any previous errors

    // Store filename in a custom property for client-side download
    result.fileName = fileName;

    return result
}


export const createReportDocX = async (report: Report, contents: Record<string, any>) => {

    var result: DocxCreateResponse = { success: false, url: '', error: '', fileName: '' }

    // In production: /app/dist/donation/browser/assets/reports
    // In dev: relative to project root
    const assetsBase = isProduction
        ? path.resolve(process.cwd(), 'dist/donation/browser/assets/reports')
        : path.resolve(__dirname, '../assets/reports');
    const fullPath = path.join(assetsBase, report.templatePath);
    console.log('fullPath', fullPath)
    console.log('contents', JSON.stringify(contents))
    
    var content = ''
    try {
        // Load the docx file as binary content
        content = fs.readFileSync(
            fullPath,
            "binary"
        );
    } catch (err) {
        result.error = 'fullPath.readed.error' + fullPath + " :: " + err
        console.error(result.error)
        return result
    }

    // Unzip the content of the file
    const zip = new PizZip(content);

    /*
     * Parse the template.
     * This function throws an error if the template is invalid,
     * for example, if the template is "Hello {user" (missing closing tag)
     */
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    /*
     * Render the document : Replaces :
     * - {first_name} with John
     * - {last_name} with Doe,
     * ...
     */
    // const data = contents.reduce((acc, curr) => {
    //     acc[curr.name] = curr.value;
    //     return acc;
    // }, {} as Record<string, string>);

    doc.render(contents);

    /*
     * Get the document as a zip (docx are zipped files)
     * and generate it as a Node.js buffer
     */
    const buf = doc.getZip().generate({
        type: "nodebuffer",
        // type: "nodebuffer",
        /*
         * Compression: DEFLATE adds a compression step.
         * For a 50MB document, expect 500ms additional CPU time.
         */
        compression: "DEFLATE",
    });

    // Convert buffer to base64 for client download
    const base64 = buf.toString('base64');
    const fileName = `${report.caption}.docx`;
    // const fileName = `${type.caption}_${new Date().getTime()}.docx`;

    result.success = true;
    result.url = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
    result.error = ''; // Clear any previous errors

    // Store filename in a custom property for client-side download
    result.fileName = fileName;

    return result
}
