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
    constructor(public caption = '', public fields = [] as string[]) {
        this.caption = caption
    }
    public id = '';// should be: 'ty_normal'

    
    static getFields() {
        const result = [
            this.ty_normal,
            this.ty_reason
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
