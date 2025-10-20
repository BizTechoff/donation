import { Allow, BackendMethod, Controller, remult } from 'remult';
import { Donation } from '../entity';
import { Letter } from '../enum/letter';
import { DocxContentControl, DocxCreateResponse } from '../type/letter.type';

@Controller('letter')
export class LetterController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async createLetter(donationId = '', type = Letter.ty_normal, prefix = [] as string[], suffix = [] as string[]): Promise<DocxCreateResponse> {

    const donation = await remult.repo(Donation).findId(donationId)
    if (!donation) throw 'NO donation for id: ' + donationId

    const contents = [] as DocxContentControl[]
    contents.push({ name: 'letter_prefix', value: prefix.join('\n') })
    for (const fld of type.fields) {
      const value = (LetterController.getValue(donation, type, fld) ?? '').trim()
      if (value) {
        contents.push({
          name: fld,
          value: value
        })
      }
    }
    contents.push({ name: 'letter_suffix', value: suffix.join('\n') })

    return await LetterController.createLetterDelegate(type, contents)
  }

  private static getValue(donation: Donation, type: Letter, field = '') {
    switch (field) {
      case 'letter_heb_date': {
        return 'תאריך עברי'
        // return getHebrewDate(new Date())
      }
      case 'donor_eng_title': {
        return donation.donor?.titleEnglish
      }
      case 'donor_eng_first_name': {
        return donation.donor?.firstNameEnglish
      }
      case 'donor_eng_last_name': {
        return donation.donor?.lastNameEnglish
      }
      case 'donor_eng_suffix': {
        return donation.donor?.suffixEnglish
      }
      case 'donor_home_address': {
        return donation.donor?.homePlace?.fullAddress
      }
      case 'donor_country': {
        return donation.donor?.homePlace?.country?.name
      }
      // case 'letter_prefix': {
      // }
      case 'donor_title': {
        return donation.donor?.title
      }
      case 'donor_first_name': {
        return donation.donor?.firstName
      }
      case 'donor_last_name': {
        return donation.donor?.lastName
      }
      case 'donor_suffix': {
        return donation.donor?.suffix
      }
      case 'donation_amount': {
        return donation.amount + ''
      }
      case 'donation_currency_symbol': {
        return 'סמל מטבע'
        // return getCurrencySymbol(donation.currency)
      }
      default: return ''// throw 'no-field-name: ' + field
      // case 'letter_suffix': {
      // }
    }
  }

  static createLetterDelegate: (type: Letter, contents: DocxContentControl[]) => Promise<DocxCreateResponse>

}
