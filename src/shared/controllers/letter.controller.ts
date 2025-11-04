import { Allow, BackendMethod, Controller, remult } from 'remult';
import { Donation, DonorPlace } from '../entity';
import { Letter } from '../enum/letter';
import { DocxContentControl, DocxCreateResponse } from '../type/letter.type';

@Controller('letter')
export class LetterController {
  
  static createLetterDelegate: (type: Letter, contents: DocxContentControl[]) => Promise<DocxCreateResponse>

  @BackendMethod({ allowed: Allow.authenticated })
  static async createLetter(donationId = '', type: Letter, fieldValues: { [key: string]: string }, prefix = [] as string[], suffix = [] as string[]): Promise<DocxCreateResponse> {

    const donation = await remult.repo(Donation).findId(
      donationId,
      { include: { donor: true, campaign: true } })
    if (!donation) throw 'NO donation for id: ' + donationId

    const contents = [] as DocxContentControl[]
    contents.push({ name: 'letter_prefix', value: prefix.join('\n') })

    // Use the provided fieldValues instead of calculating them
    for (const [fieldName, fieldValue] of Object.entries(fieldValues)) {
      const value = (fieldValue ?? '').trim()
      if (value) {
        contents.push({
          name: fieldName,
          value: value
        })
      }
    }

    contents.push({ name: 'letter_suffix', value: suffix.join('\n') })
    console.table(contents)

    return await LetterController.createLetterDelegate(type, contents)
  }

  // static async getValue(donation: Donation, type: Letter, field: string): Promise<string> {
  //   if (!donation) return '';
  //   var result = ''

  //   switch (field) {
  //     // ===== English/American Letter Fields =====
  //     case 'Amount': {
  //       result = donation.amount.toString();
  //       break;
  //     }
  //     case 'Number_receipt': {
  //       result = '000000' + donation.referenceNumber
  //       result = result.slice(-6)
  //       break
  //     }
  //     case 'Name_receipt': {
  //       result = donation.payerName
  //       break
  //     }
  //     case 'FullAddress_Work': {
  //       result = donation.payerAddress || ''
  //       break
  //     }
  //     case 'FullCity_Work': {
  //       result = donation.payerAddress || ''
  //       break
  //     }
  //     case 'FullAddress': {
  //       const parts = [] as string[]

  //       const toCamelCase = (str: string): string => {
  //         return str.replace(/_([a-z])/g, (match, char) => char.toUpperCase());
  //       }

  //       const row1 =
  //         `${donation.donor?.titleEnglish || ''} ${donation.donor?.maritalStatus === 'married' ? ' & Mrs' : ''} ${donation.donor?.firstNameEnglish?.[0]?.toUpperCase() || ''} ${toCamelCase(donation.donor?.lastNameEnglish || '')}` || ''

  //       const address = await remult.repo(DonorPlace).findFirst({ donor: donation.donor })
  //       const row2 = `${address?.place?.apartment || ''} ${address?.place?.building || ''}` || ''
  //       const row3 = `${address?.place?.houseNumber || ''} ${address?.place?.street || ''}` || ''
  //       const row4 = `${address?.place?.city || ''} ${address?.place?.country?.code === 'US' ? address?.place?.country?.name || '' : ''} ${address?.place?.postcode || ''}` || ''
  //       const row5 = address?.place?.country?.name || ''

  //       parts.push(row1, row2, row3, row4, row5)
  //       console.log('getValue',row1, row2, row3, row4, row5)
  //       result = parts.filter(p => p.trim()).join('\n')
  //       console.log('result',result)
  //       break
  //     }

  //     // ===== Hebrew Common Fields =====
  //     case 'תואר_עברית': {
  //       result = `${donation.donor?.title || ''}`
  //       break
  //     }
  //     case 'תואר  מלא': { // Handle typo in some templates
  //       result = `${donation.donor?.title || ''}`
  //       break
  //     }
  //     case 'שם_עברית': {
  //       result = `${donation.donor?.firstName || ''} ${donation.donor?.lineage === 'israel' ? '' : donation.donor?.lineage || ''} ${donation.donor?.lastName || ''} `.trim()
  //       break
  //     }
  //     case 'סיומת_עברית': {
  //       result = `${donation.donor?.suffix || ''}`
  //       break
  //     }
  //     case 'תרומה': {
  //       const currency = await LetterController.getValue(donation, type, 'Currency_symbol')
  //       result = `${currency}${donation.amount.toString()}`;
  //       break
  //     }
  //     case 'סיבה_תרומה': {
  //       result = donation.reason || '';
  //       break
  //     }
  //     case 'Currency_symbol': {
  //       const currencySymbols: Record<string, string> = {
  //         'ILS': '₪',
  //         'USD': '$',
  //         'EUR': '€',
  //         'GBP': '£',
  //         'JPY': '¥'
  //       };
  //       result = currencySymbols[donation.currency || 'ILS'] || donation.currency || '₪';
  //       break
  //     }

  //     // ===== Condolence Fields (ניחום אבלים) =====
  //     // case 'תואר_נפטר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[תואר נפטר]';
  //     //   break;
  //     // }
  //     // case 'פרטי_נפטר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[פרטי נפטר]';
  //     //   break;
  //     // }
  //     // case 'קשר_לנפטר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[קשר לנפטר]';
  //     //   break;
  //     // }
  //     // case 'אב_הנפטר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[אב הנפטר]';
  //     //   break;
  //     // }
  //     // case 'סיומת_נפטר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[סיומת נפטר]';
  //     //   break;
  //     // }

  //     // // ===== Simcha Fields (שמחות) =====
  //     // case 'תואר_חתן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[תואר חתן]';
  //     //   break;
  //     // }
  //     // case 'שם_חתן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[שם חתן]';
  //     //   break;
  //     // }
  //     // case 'סיומת_חתן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[סיומת חתן]';
  //     //   break;
  //     // }
  //     // case 'קירבה_חתן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[קירבה לחתן]';
  //     //   break;
  //     // }

  //     // // ===== Mechutan Fields =====
  //     // case 'תואר_מחותן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[תואר מחותן]';
  //     //   break;
  //     // }
  //     // case 'שם_מחותן': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[שם מחותן]';
  //     //   break;
  //     // }
  //     // case 'סיומת_מחותן':
  //     // case 'סיומת_ מחותן': { // Handle space typo in some templates
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[סיומת מחותן]';
  //     //   break;
  //     // }

  //     // // ===== Father Fields (אב) =====
  //     // case 'קירבה_אב': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[קירבה לאב]';
  //     //   break;
  //     // }
  //     // case 'תואר_אב': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[תואר אב]';
  //     //   break;
  //     // }
  //     // case 'שם_אב':
  //     // case 'שם _אב': { // Handle space typo
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[שם אב]';
  //     //   break;
  //     // }
  //     // case 'סיומת_אב': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[סיומת אב]';
  //     //   break;
  //     // }

  //     // // ===== Grandfather Fields (סב) =====
  //     // case 'קירבה_סב': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[קירבה לסב]';
  //     //   break;
  //     // }
  //     // case 'סב_תואר': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[תואר סב]';
  //     //   break;
  //     // }
  //     // case 'סב_שם': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[שם סב]';
  //     //   break;
  //     // }
  //     // case 'סב_סיומת': {
  //     //   // TODO: Get from related entity or modal input
  //     //   result = '[סיומת סב]';
  //     //   break;
  //     // }

  //     // ===== Legacy fields (from old Letter class) =====
  //     case 'letter_heb_date': {
  //       const hDate = new HDate(new Date());
  //       result = hDate.renderGematriya();
  //       break;
  //     }
  //     case 'donor_eng_title': {
  //       result = donation.donor?.titleEnglish || '';
  //       break;
  //     }
  //     case 'donor_eng_first_name': {
  //       result = donation.donor?.firstNameEnglish || '';
  //       break;
  //     }
  //     case 'donor_eng_last_name': {
  //       result = donation.donor?.lastNameEnglish || '';
  //       break;
  //     }
  //     case 'donor_eng_suffix': {
  //       result = donation.donor?.suffix || '';
  //       break;
  //     }
  //     case 'donor_home_address': {
  //       const address = await remult.repo(DonorPlace).findFirst({ donor: donation.donor })
  //       result = `${address?.place?.street || ''} ${address?.place?.houseNumber || ''}`.trim();
  //       break;
  //     }
  //     case 'donor_country': {
  //       const address = await remult.repo(DonorPlace).findFirst({ donor: donation.donor })
  //       result = address?.place?.country?.name || '';
  //       break;
  //     }
  //     case 'donor_title': {
  //       result = donation.donor?.title || '';
  //       break;
  //     }
  //     case 'donor_first_name': {
  //       result = donation.donor?.firstName || '';
  //       break;
  //     }
  //     case 'donor_last_name': {
  //       result = donation.donor?.lastName || '';
  //       break;
  //     }
  //     case 'donor_suffix': {
  //       result = donation.donor?.suffix || '';
  //       break;
  //     }
  //     case 'donation_amount': {
  //       result = donation.amount.toString();
  //       break;
  //     }
  //     case 'donation_currency_symbol': {
  //       const currencySymbols: Record<string, string> = {
  //         'ILS': '₪',
  //         'USD': '$',
  //         'EUR': '€',
  //         'GBP': '£',
  //         'JPY': '¥'
  //       };
  //       result = currencySymbols[donation.currency || 'ILS'] || donation.currency || '₪';
  //       break;
  //     }
  //     case 'donation_reason': {
  //       result = donation.reason || '';
  //       break;
  //     }
  //   }

  //   console.log(field, result)
  //   return result
  // }

}
