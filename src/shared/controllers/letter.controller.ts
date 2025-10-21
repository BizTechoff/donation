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
      { include: { donor: { include: { homePlace: { include: { country: true } } } }, campaign: true } })
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

  static getValue(donation:Donation, type: Letter, field: string): string {
    if (!donation) return '';
    var result = ''

    switch (field) {
      case 'letter_heb_date': {
        const hDate = new HDate(new Date());
        result = hDate.renderGematriya();
        break
      }
      case 'donor_eng_title':
        {
          result = donation.donor?.titleEnglish || '';
          break
        }
      case 'donor_eng_first_name':
        {
          result = donation.donor?.firstNameEnglish || '';
          break
        }
      case 'donor_eng_last_name':
        {
          result = donation.donor?.lastNameEnglish || '';
          break
        }
      case 'donor_eng_suffix':
        {
          result = donation.donor?.suffixEnglish || '';
          break
        }
      case 'donor_home_address':
        {
          result = donation.donor?.homePlace?.fullAddress || '';
          break
        }
      case 'donor_country':
        {
          result = donation.donor?.homePlace?.country?.nameEn || '';
          break
        }
      case 'donor_title':
        {
          result = donation.donor?.title || '';
          break
        }
      case 'donor_first_name':
        {
          result = donation.donor?.firstName || '';
          break
        }
      case 'donor_last_name':
        {
          result = donation.donor?.lastName || '';
          break
        }
      case 'donor_suffix':
        {
          result = donation.donor?.suffix || '';
          break
        }
      case 'donation_amount':
        {
          result = donation.amount.toString();
          break
        }
      case 'donation_reason':
        {
          result = donation.reason || '';
          break
        }
      case 'donation_currency_symbol': {
        const currencySymbols: Record<string, string> = {
          'ILS': '₪',
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'JPY': '¥'
        };
        {
          result = currencySymbols[donation.currency || 'ILS'] || donation.currency || '₪';
          break
        }
      }
    }
    console.log(field, result)

    return result
  }

  static createLetterDelegate: (type: Letter, contents: DocxContentControl[]) => Promise<DocxCreateResponse>

}
