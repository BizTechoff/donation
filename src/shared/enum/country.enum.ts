import { ValueListFieldType } from "remult";

@ValueListFieldType()
export class Country {
    static israel = new Country('IL', 'ישראל', 'Israel', 'ILS', '₪', '+972')
    static usa = new Country('US', 'ארצות הברית', 'United States', 'USD', '$', '+1')
    static uk = new Country('GB', 'בריטניה', 'United Kingdom', 'GBP', '£', '+44')
    static france = new Country('FR', 'צרפת', 'France', 'EUR', '€', '+33')
    static belgium = new Country('BE', 'בלגיה', 'Belgium', 'EUR', '€', '+32')
    static switzerland = new Country('CH', 'שווייץ', 'Switzerland', 'CHF', 'CHF', '+41')
    static canada = new Country('CA', 'קנדה', 'Canada', 'CAD', 'C$', '+1')
    static australia = new Country('AU', 'אוסטרליה', 'Australia', 'AUD', 'A$', '+61')
    static germany = new Country('DE', 'גרמניה', 'Germany', 'EUR', '€', '+49')
    static netherlands = new Country('NL', 'הולנד', 'Netherlands', 'EUR', '€', '+31')
    static argentina = new Country('AR', 'ארגנטינה', 'Argentina', 'ARS', '$', '+54')
    static brazil = new Country('BR', 'ברזיל', 'Brazil', 'BRL', 'R$', '+55')
    static mexico = new Country('MX', 'מקסיקו', 'Mexico', 'MXN', '$', '+52')
    static southAfrica = new Country('ZA', 'דרום אפריקה', 'South Africa', 'ZAR', 'R', '+27')
    static russia = new Country('RU', 'רוסיה', 'Russia', 'RUB', '₽', '+7')
    static ukraine = new Country('UA', 'אוקראינה', 'Ukraine', 'UAH', '₴', '+380')
    static spain = new Country('ES', 'ספרד', 'Spain', 'EUR', '€', '+34')
    static italy = new Country('IT', 'איטליה', 'Italy', 'EUR', '€', '+39')
    static poland = new Country('PL', 'פולין', 'Poland', 'PLN', 'zł', '+48')
    static austria = new Country('AT', 'אוסטריה', 'Austria', 'EUR', '€', '+43')
    static scotland = new Country('GB-SCT', 'סקוטלנד', 'Scotland', 'GBP', '£', '+44')

    constructor(
        public id: string,
        public captionHebrew: string,
        public captionEnglish: string,
        public currency: string,
        public currencySymbol: string,
        public phonePrefix: string
    ) {}

    get caption() {
        return this.captionHebrew;
    }

    toString() {
        return this.id;
    }
}