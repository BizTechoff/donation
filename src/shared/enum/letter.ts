import { ValueListFieldType } from "remult";

@ValueListFieldType<Letter>({ caption: 'סוג מכתב מחודש' })
export class Letter {

  static letter_america_tynoreceipt = new Letter('אמריקה / TYNoReceipt', 'אמריקה/TYNoReceipt.docx', [
    'FullAddress',
    'Amount',
    'תרומה'
  ])
  static letter_america_tyreceipt = new Letter('אמריקה / TYReceipt', 'אמריקה/TYReceipt.docx', [
    'FullAddress',
    'Number_receipt',
    'Amount',
    'Name_receipt',
    'FullAddress_Work',
    'FullCity_Work'
  ])
  static letter_america_tyyeshivanoreceipt = new Letter('אמריקה / TYYeshivaNoReceipt', 'אמריקה/TYYeshivaNoReceipt.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תרומה',
    'סיומת_מכתב'
  ])
  static letter_america_tyyeshivareceipt = new Letter('אמריקה / TYYeshivaReceipt', 'אמריקה/TYYeshivaReceipt.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תרומה',
    'סיומת_מכתב',
    'Amount',
    'Name_receipt',
    'FullAddress_Work',
    'FullCity_Work'
  ])
  static letter_condolence_ab = new Letter('ניחום אבלים / אב', 'ניחום אבלים/אב.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_ach = new Letter('ניחום אבלים / אח', 'ניחום אבלים/אח.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_achvt = new Letter('ניחום אבלים / אחות', 'ניחום אבלים/אחות.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_am = new Letter('ניחום אבלים / אם', 'ניחום אבלים/אם.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_bn = new Letter('ניחום אבלים / בן', 'ניחום אבלים/בן.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_bt_zvg = new Letter('ניחום אבלים / בת זוג', 'ניחום אבלים/בת זוג.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_condolence_bt = new Letter('ניחום אבלים / בת', 'ניחום אבלים/בת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_נפטר',
    'פרטי_נפטר',
    'קשר_לנפטר',
    'אב_הנפטר',
    'סיומת_נפטר'
  ])
  static letter_engagement_bn = new Letter('שמחות / אירוסין / בן', 'שמחות/אירוסין/בן.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_מחותן',
    'סיומת_מכתב'
  ])
  static letter_engagement_bt = new Letter('שמחות / אירוסין / בת', 'שמחות/אירוסין/בת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_engagement_nyn = new Letter('שמחות / אירוסין / נין', 'שמחות/אירוסין/נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_engagement_nynh = new Letter('שמחות / אירוסין / נינה', 'שמחות/אירוסין/נינה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_engagement_nkd = new Letter('שמחות / אירוסין / נכד', 'שמחות/אירוסין/נכד.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_engagement_nkdh = new Letter('שמחות / אירוסין / נכדה', 'שמחות/אירוסין/נכדה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_son_bn_nyn = new Letter('שמחות / בן / בן נין', 'שמחות/בן/בן נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_son_bn = new Letter('שמחות / בן / בן', 'שמחות/בן/בן.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_son_nyn = new Letter('שמחות / בן / נין', 'שמחות/בן/נין.docx', [
    'FullAddress',
    'תואר  מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_son_nkd = new Letter('שמחות / בן / נכד', 'שמחות/בן/נכד.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_barmitzvah_bn = new Letter('שמחות / בר מצוה / בן', 'שמחות/בר מצוה/בן.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_barmitzvah_nyn = new Letter('שמחות / בר מצוה / נין', 'שמחות/בר מצוה/נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_barmitzvah_nkd = new Letter('שמחות / בר מצוה / נכד', 'שמחות/בר מצוה/נכד.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_daughter_bt_nyn = new Letter('שמחות / בת / בת נין', 'שמחות/בת/בת נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_daughter_bt = new Letter('שמחות / בת / בת', 'שמחות/בת/בת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_daughter_nynh = new Letter('שמחות / בת / נינה', 'שמחות/בת/נינה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם _אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_daughter_nkdh = new Letter('שמחות / בת / נכדה', 'שמחות/בת/נכדה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_wedding_bn = new Letter('שמחות / נישואין / בן', 'שמחות/נישואין/בן.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_wedding_bt = new Letter('שמחות / נישואין / בת', 'שמחות/נישואין/בת.docx', [
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_wedding_nyn = new Letter('שמחות / נישואין / נין', 'שמחות/נישואין/נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_wedding_nynh = new Letter('שמחות / נישואין / נינה', 'שמחות/נישואין/נינה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_wedding_nkd = new Letter('שמחות / נישואין / נכד', 'שמחות/נישואין/נכד.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_wedding_nkdh = new Letter('שמחות / נישואין / נכדה', 'שמחות/נישואין/נכדה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'תואר_מחותן',
    'שם_מחותן',
    'סיומת_ מחותן',
    'סיומת_מכתב'
  ])
  static letter_sefertorah_hknst_spr_tvrh = new Letter('שמחות / ספר תורה / הכנסת ספר תורה', 'שמחות/ספר תורה/הכנסת ספר תורה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_other_byt_chdsh_ = new Letter('שמחות / שונות / בית חדש ', 'שמחות/שונות/בית חדש .docx', [
  ])
  static letter_twins_bn_vbt = new Letter('שמחות / תאומים / בן ובת', 'שמחות/תאומים/בן ובת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_twins_bnvt_nyn = new Letter('שמחות / תאומים / בנות נין', 'שמחות/תאומים/בנות נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_twins_bnvt = new Letter('שמחות / תאומים / בנות', 'שמחות/תאומים/בנות.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_twins_bny_nyn_bn_vbt = new Letter('שמחות / תאומים / בני נין - בן ובת', 'שמחות/תאומים/בני נין - בן ובת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_twins_bny_nyn = new Letter('שמחות / תאומים / בני נין', 'שמחות/תאומים/בני נין.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'קירבה_סב',
    'סב_תואר',
    'סב_שם',
    'סב_סיומת',
    'סיומת_מכתב'
  ])
  static letter_twins_bnym = new Letter('שמחות / תאומים / בנים', 'שמחות/תאומים/בנים.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'סיומת_מכתב'
  ])
  static letter_twins_nynvt = new Letter('שמחות / תאומים / נינות', 'שמחות/תאומים/נינות.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_twins_nynym_bn_vbt = new Letter('שמחות / תאומים / נינים -בן ובת', 'שמחות/תאומים/נינים -בן ובת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_twins_nynym = new Letter('שמחות / תאומים / נינים', 'שמחות/תאומים/נינים.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'קירבה_אב',
    'תואר_אב',
    'שם_אב',
    'סיומת_אב',
    'סיומת_מכתב'
  ])
  static letter_twins_nkdvt = new Letter('שמחות / תאומים / נכדות', 'שמחות/תאומים/נכדות.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_twins_nkdym_bn_vbt = new Letter('שמחות / תאומים / נכדים - בן ובת', 'שמחות/תאומים/נכדים - בן ובת.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_twins_nkdym = new Letter('שמחות / תאומים / נכדים', 'שמחות/תאומים/נכדים.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'קירבה_חתן',
    'תואר_חתן',
    'שם_חתן',
    'סיומת_חתן',
    'סיומת_מכתב'
  ])
  static letter_donation_mktb_tvdh_am_sybh = new Letter('תרומות / מכתב תודה עם סיבה', 'תרומות/מכתב תודה עם סיבה.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תרומה',
    'סיבה_תרומה',
    'סיומת_מכתב'
  ])
  static letter_donation_mktb_tvdh_rgyl = new Letter('תרומות / מכתב תודה רגיל', 'תרומות/מכתב תודה רגיל.docx', [
    'FullAddress',
    'תואר_מלא',
    'תואר_עברית',
    'שם_עברית',
    'סיומת_עברית',
    'תרומה',
    'סיומת_מכתב'
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
      this.letter_america_tynoreceipt,
      this.letter_america_tyreceipt,
      this.letter_america_tyyeshivanoreceipt,
      this.letter_america_tyyeshivareceipt,
      this.letter_condolence_ab,
      this.letter_condolence_ach,
      this.letter_condolence_achvt,
      this.letter_condolence_am,
      this.letter_condolence_bn,
      this.letter_condolence_bt_zvg,
      this.letter_condolence_bt,
      this.letter_engagement_bn,
      this.letter_engagement_bt,
      this.letter_engagement_nyn,
      this.letter_engagement_nynh,
      this.letter_engagement_nkd,
      this.letter_engagement_nkdh,
      this.letter_son_bn_nyn,
      this.letter_son_bn,
      this.letter_son_nyn,
      this.letter_son_nkd,
      this.letter_barmitzvah_bn,
      this.letter_barmitzvah_nyn,
      this.letter_barmitzvah_nkd,
      this.letter_daughter_bt_nyn,
      this.letter_daughter_bt,
      this.letter_daughter_nynh,
      this.letter_daughter_nkdh,
      this.letter_wedding_bn,
      this.letter_wedding_bt,
      this.letter_wedding_nyn,
      this.letter_wedding_nynh,
      this.letter_wedding_nkd,
      this.letter_wedding_nkdh,
      this.letter_sefertorah_hknst_spr_tvrh,
      this.letter_other_byt_chdsh_,
      this.letter_twins_bn_vbt,
      this.letter_twins_bnvt_nyn,
      this.letter_twins_bnvt,
      this.letter_twins_bny_nyn_bn_vbt,
      this.letter_twins_bny_nyn,
      this.letter_twins_bnym,
      this.letter_twins_nynvt,
      this.letter_twins_nynym_bn_vbt,
      this.letter_twins_nynym,
      this.letter_twins_nkdvt,
      this.letter_twins_nkdym_bn_vbt,
      this.letter_twins_nkdym,
      this.letter_donation_mktb_tvdh_am_sybh,
      this.letter_donation_mktb_tvdh_rgyl
    ]
    return result
  }

  static fromString(typeId = '') {
    var result = Letter.letter_america_tynoreceipt
    if (typeId?.trim().length) {
      const found = Letter.getFields().find((type) => type.id === typeId);
      if (found) {
        result = found
      }
    }
    return result
  }

}
