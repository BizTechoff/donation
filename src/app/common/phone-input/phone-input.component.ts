import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, forwardRef } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { CountryCode } from 'libphonenumber-js/max'
import {
  DEFAULT_PHONE_COUNTRY,
  PhoneLineType,
  ParsedPhone,
  callingCodeForCountry,
  countryForCallingCode,
  formatAsYouType,
  isAllowedPhoneChar,
  parsePhone,
  sanitizePhoneInput,
  partialCallingCode,
  toE164,
  withCountry
} from '../../../shared/utils/phone-format'

/** אפשרות בבוחר המדינה. נבנית מיישות Country של הפלטפורמה. */
export interface PhoneCountryOption {
  /** קוד דו-אותי - IL, GB, US */
  code: string
  /** שם בעברית, כפי ששמור ביישות */
  name: string
  /** קידומת חיוג, עם או בלי פלוס */
  phonePrefix: string
}

/**
 * app-phone-input - קונטרול הטלפון של הפלטפורמה. סעיפים 1 ו-31.
 *
 * מאגד את B4, Z4, Z9, Z14, H2, I1 ואת B3 (הפלוס בצד הלא נכון). ההתנהגות
 * בסגנון Google Contacts: דגל וקידומת מזוהים לבד, המספר מתעצב תוך כדי
 * הקלדה, ונשמר ב-E.164.
 *
 * שלוש החלטות שראוי להכיר לפני שינוי:
 *
 * 1. dir="ltr" על השדה תמיד, גם בממשק עברי. מספר טלפון הוא רצף ספרות שנקרא
 *    משמאל לימין, ובשדה RTL הפלוס קופץ לצד הלא נכון (B3) והספרות מתהפכות
 *    חזותית.
 *
 * 2. ולידציה = סימון בלבד, לא חסימה. מספר לא תקין נשמר ומסומן. בפלטפורמה יש
 *    נתונים היסטוריים שאינם תקינים, וחסימה היתה מונעת שמירה של תורם שלם בגלל
 *    ספרה חסרה בטלפון.
 *
 * 3. סוג הקו נכתב אל שדה התיאור ולא לשדה חדש. זה לא קיצור דרך - זה מה שמשמר
 *    מקור אמת אחד: phone-utils/sqlIsMobile מסווג נייד בתוך פוסטגרס, שם אי
 *    אפשר להריץ libphonenumber. התיאור הוא השדה שגם המסך וגם ה-SQL קוראים.
 *    ראה phone-format.ts.
 */
@Component({
  selector: 'app-phone-input',
  templateUrl: './phone-input.component.html',
  styleUrls: ['./phone-input.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => PhoneInputComponent),
    multi: true
  }]
})
export class PhoneInputComponent implements ControlValueAccessor {

  constructor(private host: ElementRef<HTMLElement>) { }

  /** המדינה שלפיה מפוענח מספר בלי קידומת בינלאומית. */
  @Input() defaultCountry = DEFAULT_PHONE_COUNTRY

  /**
   * רשימת המדינות לבוחר. מגיעה מיישות Country של הפלטפורמה - היא כבר מחזיקה
   * שם בעברית, קוד וקידומת, ואין סיבה להחזיק רשימה שנייה מ-libphonenumber.
   * רשימה ריקה = בלי בוחר, רק זיהוי אוטומטי.
   */
  @Input() countries: PhoneCountryOption[] = []

  @Input() placeholder = ''

  /**
   * כותרת השדה. כשהיא מועברת, הקונטרול מרנדר אותה בעצמו ושורת הסטטוס
   * (קידומת וסוג קו) יושבת לידה ולא מתחת לשדה - כך היא לא מוסיפה שורה
   * לגובה הטופס ולא מזיזה את השדות שלידה.
   */
  @Input() label = ''

  /**
   * האייקון שליד הכותרת. ריק = בלי אייקון.
   *
   * בטפסים שבהם לשדות השכנים אין אייקון ליד הכותרת (מודאל איש הקשר), אייקון
   * רק לטלפון נראה כמו חריגה ולא כמו הדגשה.
   */
  @Input() labelIcon = 'phone'

  @Input() disabled = false

  /** מציג את שורת הסטטוס מתחת לשדה - דגל, מדינה, סוג קו וסימון תקינות. */
  @Input() showStatus = true

  /**
   * סוג הקו שזוהה, בכל שינוי. הצרכן אחראי לכתוב אותו לתיאור - הקונטרול לא
   * נוגע בשדות אחרים של הרשומה.
   */
  @Output() lineTypeDetected = new EventEmitter<PhoneLineType>()

  /** מה שמוצג בשדה - מעוצב תוך כדי הקלדה. */
  display = ''
  /** הבוחר פתוח. */
  pickerOpen = false
  /** טקסט הסינון בבוחר. */
  countrySearch = ''
  /** המדינה שהמשתמש בחר ידנית, אם בחר. גוברת על defaultCountry. */
  private selectedCountry?: CountryCode
  /** מה שנשמר - E.164. */
  private value = ''
  parsed?: ParsedPhone

  /** המדינה שלפיה מפוענח מספר מקומי: בחירה ידנית, ואחרת ברירת המחדל. */
  private get activeCountry(): CountryCode {
    return this.selectedCountry || this.defaultCountry
  }

  private onChange: (value: string) => void = () => { }
  private onTouched: () => void = () => { }

  // ── ControlValueAccessor

  writeValue(value: string | null | undefined): void {
    this.value = (value || '').trim()
    this.parsed = parsePhone(this.value, this.activeCountry)
    // ערך שמור מוצג בפורמט הבינלאומי, כמו ביציאה מהשדה - הקידומת היא חלק
    // מהמספר ומקומה גלוי. בפורמט המקומי היא נעלמה בטעינה, והמשתמש ראה
    // "058 2542547" במקום "+260 58 2542547".
    this.display = this.parsed?.international || this.value
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn }
  registerOnTouched(fn: () => void): void { this.onTouched = fn }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled }

  // ── קלט

  /** הקלט עצמו. נדרש כדי לכתוב אליו חזרה ולהחזיר את הסמן למקומו. */
  @ViewChild('numberInput') numberInput?: ElementRef<HTMLInputElement>

  /**
   * חסימת תו שאינו ספרה או פלוס, ברמת המקש.
   *
   * זו שכבה שנייה ולא היחידה: הדבקה, גרירה ו-IME אינם מגיעים לכאן בכלל,
   * ואותם תופס onUserInput שמנקה את הערך עצמו. התועלת כאן היא שהתו פשוט
   * לא נכנס, בלי הבהוב של אות שנכנסת ומיד נעלמת.
   */
  onKeyDown(event: KeyboardEvent) {
    // צירופי מקשים - העתקה, הדבקה, ביטול, בחירת הכל - עוברים כמות שהם.
    if (event.ctrlKey || event.metaKey || event.altKey) return

    // כל מקש שאינו תו בודד הוא מקש עריכה או ניווט: Backspace, Delete, Tab,
    // החיצים, Home ו-End. שמם ארוך מתו אחד, וזה כל התנאי שנדרש - אין צורך
    // ברשימה שתצטרך תחזוקה.
    if (event.key.length !== 1) return

    if (!isAllowedPhoneChar(event.key)) {
      event.preventDefault()
      return
    }

    // פלוס מותר פעם אחת, ורק בתחילת המספר. "44+20" אינו מספר, ו-
    // libphonenumber היה מתעלם ממנו בשקט ומשאיר תו שאינו עושה דבר.
    // הבדיקה היא על מה שיישאר אחרי שהבחירה הנוכחית תידרס - אחרת הקלדת
    // פלוס על מספר מסומן כולו נחסמה, אף שהיא מחליפה את הפלוס הקיים.
    if (event.key === '+') {
      const input = event.target as HTMLInputElement
      const start = input.selectionStart ?? 0
      const end = input.selectionEnd ?? start
      const remaining = input.value.slice(0, start) + input.value.slice(end)
      if (start !== 0 || remaining.includes('+')) event.preventDefault()
    }
  }

  /**
   * הקלט מהשדה - כולל הדבקה וגרירה.
   *
   * שני דברים קורים כאן שאי אפשר להשאיר ל-Angular:
   *
   * 1. הערך נכתב חזרה אל ה-DOM במפורש. ה-binding [value] מתעדכן רק כש-
   *    display משתנה, ואות שהוקלדה מנוקה בניקוי - כלומר display נשאר כפי
   *    שהיה, Angular לא כותב דבר, והאות נשארת על המסך. זה היה הבאג.
   * 2. הסמן מוחזר למקומו לפי מספר הספרות שלפניו ולא לפי מספר התווים.
   *    העיצוב מוסיף ומסיר רווחים תוך כדי הקלדה, ובלי החישוב הזה הסמן קופץ
   *    לסוף בכל תו - מה שהופך עריכה באמצע המספר לבלתי אפשרית.
   */
  onUserInput(event: Event) {
    const input = event.target as HTMLInputElement
    const caret = input.selectionStart ?? input.value.length
    const clean = sanitizePhoneInput(input.value)
    const kept = sanitizePhoneInput(input.value.slice(0, caret)).length

    this.onInput(clean)

    // הכתיבה חייבת לקרות גם כשהערך לא השתנה - זה בדיוק המקרה של אות שנוקתה.
    input.value = this.display
    let position = 0
    let seen = 0
    while (position < this.display.length && seen < kept) {
      if (isAllowedPhoneChar(this.display[position])) seen++
      position++
    }
    input.setSelectionRange(position, position)
  }

  onInput(raw: string) {
    this.display = formatAsYouType(raw, this.activeCountry)
    this.parsed = parsePhone(raw, this.activeCountry)
    this.value = toE164(raw, this.activeCountry)

    this.onChange(this.value)
    this.lineTypeDetected.emit(this.parsed?.lineType || 'unknown')
  }

  /**
   * ביציאה מהשדה המספר מתייצב על הפורמט הבינלאומי - תמיד, גם למספר של
   * המדינה הפעילה.
   *
   * קודם הוצג הפורמט המקומי למדינה הפעילה, ואז הקידומת נעלמה מהשדה: מספר
   * שהוקלד כ-"+998 71 885 19 62" הוצג כ-"71 885 19 62", והמשתמש ראה שמה
   * שהקליד נמחק. הקידומת היא חלק מהמספר ומקומה גלוי - והרווח שאחריה הוא
   * גם מה שמפריד בינה לבין המספר המקומי, בלי ניחושים.
   */
  onBlur() {
    if (this.parsed) this.display = this.parsed.international
    this.onTouched()
  }

  // ── בוחר המדינה

  /** סגירה בקליק מחוץ לקונטרול - ההתנהגות שמשתמש מצפה לה מכל תפריט נפתח. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.pickerOpen) return
    if (!this.host.nativeElement.contains(event.target as Node)) this.pickerOpen = false
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.pickerOpen = false
  }

  /**
   * הרשימה אחרי סינון. מרונדרת במלואה בכוונה.
   *
   * קודם היא נחתכה ל-40 שורות כדי לחסוך את ציור הדגלים, אבל אז המדינה
   * הנבחרת פשוט לא היתה ברשימה כשהיא מחוץ לארבעים הראשונות - הסימון לא
   * הופיע והגלילה אליה לא מצאה אותה. רשימה שלמה פשוטה יותר ונכונה יותר,
   * וזה קונטרול מורכב ממילא.
   */
  get filteredCountries(): PhoneCountryOption[] {
    const term = this.countrySearch.trim().toLowerCase()
    if (!term) return this.countries
    const digits = term.replace(/\D/g, '')
    return this.countries.filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      (!!digits && (c.phonePrefix || '').replace(/\D/g, '').includes(digits)))
  }

  togglePicker() {
    if (this.disabled || !this.countries.length) return
    this.pickerOpen = !this.pickerOpen
    this.countrySearch = ''
    // הרשימה ארוכה; בלי הגלילה הזו היא נפתחת בראשה והמדינה המסומנת אינה
    // נראית, ולמשתמש אין דרך לדעת מה נבחר.
    if (this.pickerOpen) setTimeout(() => this.scrollToSelected())
  }

  /**
   * קוד המדינה המוצגת כרגע.
   *
   * בחירה ידנית גוברת כל עוד הקידומת בשדה היא של אותה מדינה. זה נדרש בגלל
   * קידומות משותפות: +1 משרתת את ארה"ב, קנדה, סנט לוסיה וכל ה-NANP, ו-
   * libphonenumber מחזיר US לכל מספר +1 שאינו שלם או שאזור החיוג שלו אינו
   * מזוהה. בלי הכלל הזה, בחירת "סנט לוסיה" התהפכה מיד ל"ארה"ב".
   */
  private get shownCountry(): string {
    if (this.selectedCountry) {
      const typed = partialCallingCode(this.display)
      if (!typed || typed === callingCodeForCountry(this.selectedCountry).replace('+', '')) {
        return this.selectedCountry
      }
    }
    return (this.parsed?.country || this.countryFromTypedPrefix || this.activeCountry || '').toUpperCase()
  }

  /** המדינה המוצגת כרגע - לסימון ברשימה. */
  isSelected(option: PhoneCountryOption): boolean {
    return (option.code || '').toUpperCase() === this.shownCountry
  }

  /** שם המדינה המוצגת, לטולטיפ על הדגל. נופל לקוד כשהשם לא ברשימה. */
  get shownCountryName(): string {
    const code = this.shownCountry
    if (!code) return ''
    return this.countries.find(c => (c.code || '').toUpperCase() === code)?.name || code
  }

  private scrollToSelected() {
    const selected = this.host?.nativeElement?.querySelector('.phone-country-item.selected')
    selected?.scrollIntoView({ block: 'center' })
  }

  /**
   * בחירת מדינה. הקידומת של המספר שכבר הוקלד מוחלפת לקידומת שנבחרה - מי
   * שבחר מדינה מצפה שהמספר יתעדכן, לא שהבחירה תחול רק על הקלדה הבאה.
   * withCountry ולא פענוח מחדש: מספר שנושא "+" מפוענח לפי הקידומת שבתוכו
   * ומתעלם מברירת המחדל, ולכן הבחירה לא היתה משנה דבר.
   */
  selectCountry(option: PhoneCountryOption) {
    const country = option.code.toUpperCase() as CountryCode
    this.selectedCountry = country
    this.pickerOpen = false

    // שדה ריק: הקידומת נכנסת אליו כדי שאפשר יהיה להמשיך להקליד ממנה.
    // שדה עם מספר: הקידומת הישנה מוחלפת בחדשה, הספרות נשמרות.
    this.onInput(this.display.trim()
      ? withCountry(this.display, country)
      : callingCodeForCountry(country))
  }

  /**
   * הדגל המוצג, לפי סדר יורד של ודאות:
   *   1. המדינה שזוהתה מהמספר המלא
   *   2. המדינה של הקידומת שהוקלדה עד כה - כך הדגל מתחלף כבר ב-"+44",
   *      הרבה לפני שהמספר שלם
   *   3. המדינה הפעילה - בחירה ידנית או ברירת המחדל
   */
  get flagClass(): string {
    // קידומת שהוקלדה ואינה שייכת לאף מדינה - בלי דגל. זה הסימון למשתמש,
    // במקום דגל ברירת מחדל שמטעה אותו לחשוב שהמספר זוהה.
    if (this.display.trim().startsWith('+') && !this.shownCountry) return ''
    const code = this.shownCountry.toLowerCase()
    return code ? `fi-${code}` : ''
  }

  /** קידומת הוקלדה אבל אינה של אף מדינה - להצגת סימן שאלה במקום דגל. */
  get hasUnknownPrefix(): boolean {
    return this.display.trim().startsWith('+') && !this.flagClass
  }

  /**
   * המדינה שמתאימה לקידומת שהוקלדה, לפי המטא-דאטה של libphonenumber - שם
   * לכל קידומת רשומה המדינה הראשית בראש ("44" -> GB, "1" -> US).
   * parsePhone מחזיר undefined עד שהמספר שלם, ולכן בזמן ההקלדה אין ממנו
   * מדינה, ו-AsYouType.getCountry() מחזיר undefined לקידומת משותפת.
   */
  private get countryFromTypedPrefix(): string {
    return countryForCallingCode(partialCallingCode(this.display))
  }

  // ── תצוגה

  get callingCode(): string {
    if (this.parsed?.callingCode) return `+${this.parsed.callingCode}`
    // בזמן ההקלדה parsePhone עדיין מחזיר undefined, אבל הקידומת כבר ידועה.
    const typed = partialCallingCode(this.display)
    return typed ? `+${typed}` : ''
  }

  get isInvalid(): boolean { return !!this.display.trim() && !!this.parsed && !this.parsed.isValid }

  /**
   * המספר שלם ונבדק. רק אז מותר לומר עליו משהו.
   *
   * בלי ההבחנה הזו "+41" לבדו הציג "בשווייץ זה מספר תקין" - הקידומת זוהתה,
   * המספר כלל לא נבדק, ו-parsePhone מחזיר undefined עד שהוא שלם. המשתמש קיבל
   * אישור על מספר שעדיין לא הקליד.
   */
  get isComplete(): boolean { return !!this.parsed?.isValid }

  get lineTypeLabel(): string {
    switch (this.parsed?.lineType) {
      case 'mobile': return 'נייד'
      // "טלפון" ולא "נייח": זה הניסוח שכבר בשימוש בנתונים (טלפון / נייד /
      // טלפון נוסף), והקונטרול מיישר אליו ולא מכניס מונח שלישי.
      case 'landline': return 'טלפון'
      default: return ''
    }
  }
}
