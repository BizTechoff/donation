import { HDate } from '@hebcal/core';
import { Allow, BackendMethod, Controller, remult } from 'remult';
import { Donation } from '../entity';
import { Letter } from '../enum/letter';
import { DocxContentControl, DocxCreateResponse } from '../type/letter.type';

@Controller('letter')
export class LetterController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async createLetter(donationId = '', type = Letter.ty_normal, prefix = [] as string[], suffix = [] as string[]): Promise<DocxCreateResponse> {

    const donation = await remult.repo(Donation).findId(
      donationId,
      { include: { donor: true } })
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
        const hDate = new HDate(new Date());
        return hDate.renderGematriya();
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
      case 'donation_reason': {
        return donation.reason
      }
      case 'donation_currency_symbol': {
        const currencySymbols: Record<string, string> = {
          'ILS': '₪',
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'JPY': '¥'
        };
        return currencySymbols[donation.currency || 'ILS'] || donation.currency || '₪';
      }
      default: return ''// throw 'no-field-name: ' + field
    }
  }

  static createLetterDelegate: (type: Letter, contents: DocxContentControl[]) => Promise<DocxCreateResponse>

}
