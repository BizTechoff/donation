import { ValueListFieldType } from "remult";

@ValueListFieldType<Letter>({ caption: 'סוג מכתב' })
export class Letter {

    static ty_normal = new Letter('מכתב תודה רגיל', [
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix'
    ])
    static ty_reason = new Letter('מכתב תודה עם סיבה', [
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'donation_reason',
        'letter_suffix'
    ])
    static ty_yeshiva_receipt = new Letter('מכתב תודה מהישיבה עם קבלה', [
        'letter_date',
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix'
    ])
    static ty_yeshiva_no_receipt = new Letter('מכתב תודה מהישיבה ללא קבלה', [
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix'
    ])
    static ty_receipt = new Letter('מכתב תודה עם קבלה', [
        'letter_date',
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix'
    ])
    static ty_no_receipt = new Letter('מכתב תודה ללא קבלה', [
        'letter_date',
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix'
    ])
    static ty_engagement_son = new Letter('אירוסי בן', [
        'letter_date',
        'letter_heb_date',
        'donor_eng_title',
        'donor_eng_first_name',
        'donor_eng_last_name',
        'donor_eng_suffix',
        'donor_home_address',
        'donor_country',
        'letter_prefix',
        'donor_title',
        'donor_first_name',
        'donor_last_name',
        'donor_suffix',
        'donation_amount',
        'donation_currency_symbol',
        'letter_suffix',
        'son_title',
        'son_first_name',
        'son_last_name',
        'son_suffix',
        'father-in-law_title',
        'father-in-law_first_name',
        'father-in-law_last_name',
        'father-in-law_suffix'
    ])
    constructor(public caption = '', public fields = [] as string[]) {
        this.caption = caption
    }
    public id = '';// should be: 'ty_normal'

    
    static getFields() {
        const result = [
            this.ty_normal,
            this.ty_reason,
            this.ty_yeshiva_receipt,
            this.ty_yeshiva_no_receipt,
            this.ty_receipt,
            this.ty_no_receipt,
            this.ty_engagement_son
        ]
        return result
    }

    static fromString(typeId = '') {
        var result = Letter.ty_normal
        if (typeId?.trim().length) {
            const found = Letter.getFields().find((type) => type.id === typeId);
            if (found) {
                result = found
            }
        }
        return result
    }

}
