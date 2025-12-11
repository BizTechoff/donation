import { ValueListFieldType } from "remult";

@ValueListFieldType<Report>({ caption: 'סוג מכתב מחודש' })
export class Report {

  static report_personal_donor_donations = new Report('reports', 'report-personal-donor-donations.docx', [
    'מתאריך',
    'עד_תאריך',
    'שם_תורם_אנגלית',
    'שם_תורם_עברית',
    'כתובת_רחוב',
    'כתובת_עיר',
    'הערות',
    'תאריך',
    'תאריך_עברי',
    'סכום',
    'התחייבות'
  ])

  constructor(
    public caption = '',
    public templatePath = '',
    public fields = [] as string[]
  ) {
    this.caption = caption;
    this.templatePath = templatePath;
  }

  public id = ''; // should be the variable name like 'letter_donation_מכתב_תודה_רגיל'

  static getFields() {
    const result = [
      this.report_personal_donor_donations
    ]
    return result
  }

  static fromString(typeId = '') {
    var result = Report.report_personal_donor_donations
    if (typeId?.trim().length) {
      const found = Report.getFields().find((type) => type.id === typeId);
      if (found) {
        result = found
      }
    }
    return result
  }

}
