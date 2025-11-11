import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Company, Donation, DonorPlace, LetterTitle } from '../../../../shared/entity';
import { Letter } from '../../../../shared/enum/letter';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { LetterService } from '../../../services/letter.service';
import { LetterTitleSelectionModalComponent } from '../letter-title-selection-modal/letter-title-selection-modal.component';

export interface LetterPropertiesModalArgs {
  donationId: string;
}

export interface LetterPropertiesResult {
  selectedType: Letter;
  prefix: string[];
  suffix: string[];
}

export interface FieldValue {
  fieldName: string;
  displayName: string;
  value: string;
  isMultiline: boolean;
}

export interface LetterCategory {
  name: string;
  subcategories: LetterSubcategory[];
}

export interface LetterSubcategory {
  name: string;
  letters: Letter[];
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '80vw',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-letter-properties-modal',
  templateUrl: './letter-properties-modal.component.html',
  styleUrls: ['./letter-properties-modal.component.scss']
})
export class LetterPropertiesModalComponent implements OnInit {
  args!: LetterPropertiesModalArgs;

  // Available letter types - NOW USING LetterRenew
  letterTypes: Letter[] = [];

  // Hierarchical structure
  categories: LetterCategory[] = [];
  selectedCategory?: LetterCategory;
  selectedSubcategory?: LetterSubcategory;
  selectedLetterType?: Letter;

  // Prefix options (opening lines)
  availablePrefixLines: string[] = [];
  selectedPrefixLines: string[] = [];
  customPrefixLine = '';

  // Suffix options (closing lines)
  availableSuffixLines: string[] = [];
  selectedSuffixLines: string[] = [];
  customSuffixLine = '';

  loading = false;

  // Donation data
  donation?: Donation;
  fieldValues: FieldValue[] = [];

  constructor(
    public i18n: I18nService,
    private letterService: LetterService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<LetterPropertiesModalComponent>
  ) { }

  async ngOnInit() {
    this.loadLetterTypes();
    await this.loadLetterTitles();
    await this.loadDonation();
  }

  async loadLetterTitles() {
    try {
      const letterTitleRepo = remult.repo(LetterTitle);

      // Load prefix lines
      const prefixTitles = await letterTitleRepo.find({
        where: { type: 'prefix', active: true },
        orderBy: { sortOrder: 'asc' }
      });
      this.availablePrefixLines = prefixTitles.map(t => t.text);

      // Load suffix lines
      const suffixTitles = await letterTitleRepo.find({
        where: { type: 'suffix', active: true },
        orderBy: { sortOrder: 'asc' }
      });
      this.availableSuffixLines = suffixTitles.map(t => t.text);
    } catch (error) {
      console.error('Error loading letter titles:', error);
      this.ui.error('שגיאה בטעינת כותרות המכתבים');
    }
  }

  async loadDonation() {
    if (!this.args?.donationId) return;

    try {
      this.loading = true;
      const donationRepo = remult.repo(Donation);
      this.donation = await donationRepo.findId(this.args.donationId, {
        include: {
          donor: true,
          campaign: true,
          organization: { include: { place: { include: { country: true } } } }
        }
      }) || undefined;

      if (this.donation) {
        await this.updateFieldValues();
      }
    } catch (error) {
      console.error('Error loading donation:', error);
      this.ui.error('שגיאה בטעינת נתוני התרומה');
    } finally {
      this.loading = false;
    }
  }

  loadLetterTypes() {
    this.letterTypes = Letter.getFields();
    this.buildCategoryHierarchy();
  }

  buildCategoryHierarchy() {
    const categoryMap = new Map<string, Map<string, Letter[]>>();

    // Build hierarchical structure from letter captions
    for (const letter of this.letterTypes) {
      const parts = letter.caption.split(' / ').map(p => p.trim());

      if (parts.length >= 2) {
        const categoryName = parts[0];
        let subcategoryName = '';

        // If 3 parts: category / subcategory / letter
        // If 2 parts: category / letter (subcategory = letter name)
        if (parts.length === 3) {
          subcategoryName = parts[1];
        } else {
          subcategoryName = parts[1];
        }

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, new Map<string, Letter[]>());
        }

        const subcategoryMap = categoryMap.get(categoryName)!;
        if (!subcategoryMap.has(subcategoryName)) {
          subcategoryMap.set(subcategoryName, []);
        }

        subcategoryMap.get(subcategoryName)!.push(letter);
      }
    }

    // Convert map to array structure
    this.categories = [];
    categoryMap.forEach((subcategoryMap, categoryName) => {
      const subcategories: LetterSubcategory[] = [];

      subcategoryMap.forEach((letters, subcategoryName) => {
        subcategories.push({
          name: subcategoryName,
          letters: letters
        });
      });

      this.categories.push({
        name: categoryName,
        subcategories: subcategories
      });
    });
  }

  async selectCategory(category: LetterCategory) {
    this.selectedCategory = category;
    this.selectedSubcategory = undefined;
    this.selectedLetterType = undefined;
    this.fieldValues = [];

    // Auto-select if only one subcategory
    if (category.subcategories.length === 1) {
      const onlySubcategory = category.subcategories[0];

      // If that subcategory has only one letter, select it directly (skip subcategory level)
      if (onlySubcategory.letters.length === 1) {
        this.selectLetterType(onlySubcategory.letters[0]);
      } else {
        // Otherwise, go to subcategory level
        await this.selectSubcategory(onlySubcategory);
      }
    }
  }

  async selectSubcategory(subcategory: LetterSubcategory) {
    this.selectedSubcategory = subcategory;
    this.selectedLetterType = undefined;
    this.fieldValues = [];

    // Auto-select if only one letter
    if (subcategory.letters.length === 1) {
      this.selectLetterType(subcategory.letters[0]);
    }
  }

  selectLetterType(type: Letter) {
    this.selectedLetterType = type;
    this.updateFieldValues();
  }

  backToCategories() {
    this.selectedCategory = undefined;
    this.selectedSubcategory = undefined;
    this.selectedLetterType = undefined;
    this.fieldValues = [];
  }

  backToSubcategories() {
    this.selectedSubcategory = undefined;
    this.selectedLetterType = undefined;
    this.fieldValues = [];
  }

  async updateFieldValues() {
    if (!this.selectedLetterType || !this.donation) {
      this.fieldValues = [];
      return;
    }

    const fieldPromises = this.selectedLetterType.fields
      .filter(field => field !== 'letter_prefix' && field !== 'letter_suffix')
      .map(async field => ({
        fieldName: field,
        displayName: this.getFieldDisplayName(field),
        value: await this.getFieldValue(field),
        isMultiline: this.isMultilineField(field)
      }));

    const allFields = await Promise.all(fieldPromises);
    this.fieldValues = allFields;
  }

  isMultilineField(field: string): boolean {
    const multilineFields = ['FullAddress', 'תואר_מלא', 'סיומת_מכתב'];
    return multilineFields.includes(field);
  }

  isAllFieldsFilled(): boolean {
    return this.fieldValues.every(fv => fv.value.trim().length > 0);
  }

  onFieldValueChange(fieldValue: FieldValue, newValue: string) {
    fieldValue.value = newValue;
  }

  getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      // English fields
      'FullAddress': 'כתובת מלאה באנגלית',
      'Amount': 'סכום',
      'Number_receipt': 'מספר קבלה',
      'Name_receipt': 'שם בקבלה',
      'FullAddress_Work': 'כתובת עבודה',
      'FullCity_Work': 'עיר עבודה',

      // Hebrew fields
      'תואר_מלא': 'תואר מלא',
      'תואר_עברית': 'תואר',
      'שם_עברית': 'שם',
      'סיומת_עברית': 'סיומת',
      'תרומה': 'סכום תרומה',
      'סיבה_תרומה': 'סיבת התרומה',
      'סיומת_מכתב': 'סיומת מכתב',

      // Condolence fields (ניחום אבלים)
      'תואר_נפטר': 'תואר נפטר',
      'פרטי_נפטר': 'פרטי נפטר',
      'קשר_לנפטר': 'קשר לנפטר',
      'אב_הנפטר': 'אב הנפטר',
      'סיומת_נפטר': 'סיומת נפטר',

      // Simcha fields (שמחות)
      'תואר_חתן': 'תואר חתן/כלה',
      'שם_חתן': 'שם חתן/כלה',
      'סיומת_חתן': 'סיומת חתן/כלה',
      'קירבה_חתן': 'קירבה לחתן/כלה',

      // Mechutan fields
      'תואר_מחותן': 'תואר מחותן',
      'שם_מחותן': 'שם מחותן',
      'סיומת_מחותן': 'סיומת מחותן',
      'סיומת_ מחותן': 'סיומת מחותן',

      // Father fields (אב)
      'קירבה_אב': 'קירבה לאב',
      'תואר_אב': 'תואר אב',
      'שם_אב': 'שם אב',
      'סיומת_אב': 'סיומת אב',
      'שם _אב': 'שם אב',

      // Grandfather fields (סב)
      'קירבה_סב': 'קירבה לסב',
      'סב_תואר': 'תואר סב',
      'סב_שם': 'שם סב',
      'סב_סיומת': 'סיומת סב',

      // Legacy fields (from old Letter class)
      'letter_heb_date': 'תאריך עברי',
      'donor_eng_title': 'תואר באנגלית',
      'donor_eng_first_name': 'שם פרטי באנגלית',
      'donor_eng_last_name': 'שם משפחה באנגלית',
      'donor_eng_suffix': 'סיומת באנגלית',
      'donor_home_address': 'כתובת',
      'donor_country': 'מדינה',
      'donor_title': 'תואר',
      'donor_first_name': 'שם פרטי',
      'donor_last_name': 'שם משפחה',
      'donor_suffix': 'סיומת',
      'donation_amount': 'סכום תרומה',
      'donation_currency_symbol': 'סמל מטבע',
      'donation_reason': 'סיבת התרומה'
    };
    return fieldNames[field] || field;
  }

  toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, char) => char.toUpperCase());
  }

  async getFieldValue(field: string): Promise<string> {
    if (!this.donation) return '';
    var result = ''

    switch (field) {
      // ===== English/American Letter Fields =====
      case 'Amount': {
        result = this.donation.amount.toString();
        break;
      }
      case 'Number_receipt': {
        result = '00000000' + this.donation.referenceNumber
        result = result.slice(-8)
        break
      }
      case 'Name_receipt': {
        result = this.donation.payerName
        break
      }
      case 'FullAddress_Work': {
        // Check if payer is the donor or an organization
        const donorFullName = `${this.donation.donor?.firstName || ''} ${this.donation.donor?.lastName || ''}`.trim();
        let place;

        if (this.donation.payerName === donorFullName) {
          // Payer is the donor - use donor's home address
          const address = await remult.repo(DonorPlace).findFirst({ donor: this.donation.donor });
          place = address?.place;
          // } else if (this.donation.organizationId && this.donation.organization?.place) {
          // Payer is an organization
        } else {
          const company = await remult.repo(Company).findFirst({ name: this.donation.payerName })
          if (company) {
            // Payer is an organization
            place = company.place;
          }
        }

        if (place) {
          result = `${place.houseNumber || ''} ${place.street || ''}`.trim();
        }
        break
      }
      case 'FullCity_Work': {
        // Check if payer is the donor or an organization
        const donorFullName = `${this.donation.donor?.firstName || ''} ${this.donation.donor?.lastName || ''}`.trim();
        let place;

        if (this.donation.payerName === donorFullName) {
          // Payer is the donor - use donor's home address
          const address = await remult.repo(DonorPlace).findFirst({ donor: this.donation.donor });
          place = address?.place;
          // } else if (this.donation.organizationId && this.donation.organization?.place) {
        } else {
          const company = await remult.repo(Company).findFirst({ name: this.donation.payerName })
          if (company) {
            // Payer is an organization
            place = company.place;
          }
        }

        if (place) {
          const parts = [];
          if (place.city) parts.push(place.city);
          if (place.country?.name) parts.push(place.country.name);
          if (place.postcode) parts.push(place.postcode);
          result = parts.join(', ');
        }
        break
      }
      case 'FullAddress': {
        const parts = [] as string[]

        const row1 =
          `${this.donation.donor?.titleEnglish} ${this.donation.donor?.maritalStatus === 'married' ? '& Mrs.' : ''} ${this.donation.donor?.firstNameEnglish[0]?.toUpperCase()} ${this.toCamelCase(this.donation.donor?.lastNameEnglish || '')}` || ''

        const address = await remult.repo(DonorPlace).findFirst({ donor: this.donation.donor })
        const row2 = `${address?.place?.apartment} ${address?.place?.building}` || ''
        const row3 = `${address?.place?.houseNumber} ${address?.place?.street}` || ''
        const row4 = `${address?.place?.city} ${address?.place?.country?.code === 'US' ? address?.place?.country?.name : ''} ${address?.place?.postcode}` || ''
        const row5 = address?.place?.country?.name || ''

        parts.push(row1?.trim(), row2?.trim(), row3?.trim(), row4?.trim(), row5?.trim())
        console.log('getValue', row1, row2, row3, row4, row5)
        result = parts.filter(p => p.trim()).join('\n')
        console.log('result', result)
        console.log('this.donation.donor.name', this.donation?.donor?.titleEnglish)


        //       parts.push(row1, row2, row3, row4, row5)
        //       console.log('getValue',row1, row2, row3, row4, row5)
        //       result = parts.filter(p => p.trim()).join('\n')
        //       console.log('result',result)

        break
      }

      // ===== Hebrew Common Fields =====
      case 'תואר_מלא': {
        const parts = [] as string[]
        parts.push(...this.selectedPrefixLines)
        result = parts.join('\n')
        break
      }
      case 'תואר_עברית': {
        result = `${this.donation.donor?.title || ''}`
        break
      }
      case 'תואר  מלא': { // Handle typo in some templates
        result = `${this.donation.donor?.title || ''}`
        break
      }
      case 'שם_עברית': {
        result = `${this.donation.donor?.firstName || ''} ${this.donation.donor?.lineage === 'israel' ? '' : this.donation.donor?.lineage || ''} ${this.donation.donor?.lastName || ''} `.trim()
        break
      }
      case 'סיומת_עברית': {
        result = `${this.donation.donor?.suffix || ''}`
        break
      }
      case 'סיומת_מכתב': {
        result = this.selectedSuffixLines.join('\n');
        break
      }
      case 'תרומה': {
        const currency = await this.getFieldValue('Currency_symbol')
        result = `${currency}${this.donation.amount.toString()}`;
        break
      }
      case 'סיבה_תרומה': {
        result = this.donation.reason || '';
        break
      }
      case 'Currency_symbol': {
        const currencySymbols: Record<string, string> = {
          'ILS': '₪',
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'JPY': '¥'
        };
        result = currencySymbols[this.donation.currency || 'ILS'] || this.donation.currency || '₪';
        break
      }

      // ===== Condolence Fields (ניחום אבלים) =====
      // case 'תואר_נפטר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[תואר נפטר]';
      //   break;
      // }
      // case 'פרטי_נפטר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[פרטי נפטר]';
      //   break;
      // }
      // case 'קשר_לנפטר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[קשר לנפטר]';
      //   break;
      // }
      // case 'אב_הנפטר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[אב הנפטר]';
      //   break;
      // }
      // case 'סיומת_נפטר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[סיומת נפטר]';
      //   break;
      // }

      // // ===== Simcha Fields (שמחות) =====
      // case 'תואר_חתן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[תואר חתן]';
      //   break;
      // }
      // case 'שם_חתן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[שם חתן]';
      //   break;
      // }
      // case 'סיומת_חתן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[סיומת חתן]';
      //   break;
      // }
      // case 'קירבה_חתן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[קירבה לחתן]';
      //   break;
      // }

      // // ===== Mechutan Fields =====
      // case 'תואר_מחותן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[תואר מחותן]';
      //   break;
      // }
      // case 'שם_מחותן': {
      //   // TODO: Get from related entity or modal input
      //   result = '[שם מחותן]';
      //   break;
      // }
      // case 'סיומת_מחותן':
      // case 'סיומת_ מחותן': { // Handle space typo in some templates
      //   // TODO: Get from related entity or modal input
      //   result = '[סיומת מחותן]';
      //   break;
      // }

      // // ===== Father Fields (אב) =====
      // case 'קירבה_אב': {
      //   // TODO: Get from related entity or modal input
      //   result = '[קירבה לאב]';
      //   break;
      // }
      // case 'תואר_אב': {
      //   // TODO: Get from related entity or modal input
      //   result = '[תואר אב]';
      //   break;
      // }
      // case 'שם_אב':
      // case 'שם _אב': { // Handle space typo
      //   // TODO: Get from related entity or modal input
      //   result = '[שם אב]';
      //   break;
      // }
      // case 'סיומת_אב': {
      //   // TODO: Get from related entity or modal input
      //   result = '[סיומת אב]';
      //   break;
      // }

      // // ===== Grandfather Fields (סב) =====
      // case 'קירבה_סב': {
      //   // TODO: Get from related entity or modal input
      //   result = '[קירבה לסב]';
      //   break;
      // }
      // case 'סב_תואר': {
      //   // TODO: Get from related entity or modal input
      //   result = '[תואר סב]';
      //   break;
      // }
      // case 'סב_שם': {
      //   // TODO: Get from related entity or modal input
      //   result = '[שם סב]';
      //   break;
      // }
      // case 'סב_סיומת': {
      //   // TODO: Get from related entity or modal input
      //   result = '[סיומת סב]';
      //   break;
      // }
    }

    console.log(field, result)
    return result
  }

  // Prefix management
  async openPrefixSelectionModal() {
    const result = await openDialog(LetterTitleSelectionModalComponent, (it) => {
      it.args = { type: 'prefix' };
    }) as LetterTitle | null;

    if (result && result.text && !this.selectedPrefixLines.includes(result.text)) {
      this.selectedPrefixLines.push(result.text);
    }
  }

  addPrefixLine(line: string) {
    if (line && !this.selectedPrefixLines.includes(line)) {
      this.selectedPrefixLines.push(line);
    }
  }

  removePrefixLine(index: number) {
    this.selectedPrefixLines.splice(index, 1);
  }

  movePrefixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index - 1];
      this.selectedPrefixLines[index - 1] = temp;
    }
  }

  movePrefixLineDown(index: number) {
    if (index < this.selectedPrefixLines.length - 1) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index + 1];
      this.selectedPrefixLines[index + 1] = temp;
    }
  }

  // Suffix management
  async openSuffixSelectionModal() {
    const result = await openDialog(LetterTitleSelectionModalComponent, (it) => {
      it.args = { type: 'suffix' };
    }) as LetterTitle | null;

    if (result && result.text && !this.selectedSuffixLines.includes(result.text)) {
      this.selectedSuffixLines.push(result.text);
    }
  }

  addSuffixLine(line: string) {
    if (line && !this.selectedSuffixLines.includes(line)) {
      this.selectedSuffixLines.push(line);
    }
  }

  removeSuffixLine(index: number) {
    this.selectedSuffixLines.splice(index, 1);
  }

  moveSuffixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index - 1];
      this.selectedSuffixLines[index - 1] = temp;
    }
  }

  moveSuffixLineDown(index: number) {
    if (index < this.selectedSuffixLines.length - 1) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index + 1];
      this.selectedSuffixLines[index + 1] = temp;
    }
  }

  async generateLetter() {
    if (!this.selectedLetterType) {
      this.ui.error('נא לבחור סוג מכתב');
      return;
    }

    if (!this.args?.donationId) {
      this.ui.error('חסר מזהה תרומה');
      return;
    }

    try {
      this.loading = true;

      // Convert fieldValues array to object for the API
      const fieldValuesMap: { [key: string]: string } = {};
      this.fieldValues.forEach(fv => {
        fieldValuesMap[fv.fieldName] = fv.value || '';
      });

      const response = await this.letterService.createLetter(
        this.args.donationId,
        this.selectedLetterType,
        fieldValuesMap,
        this.selectedPrefixLines,
        this.selectedSuffixLines
      );

      if (response.success) {
        this.ui.yesNoQuestion('מכתב הופק והורד בהצלחה', false);
        // this.dialogRef.close({
        //   selectedType: this.selectedLetterType,
        //   prefix: this.selectedPrefixLines,
        //   suffix: this.selectedSuffixLines
        // } as LetterPropertiesResult);
      } else {
        this.ui.error('שגיאה בהפקת המכתב: ' + response.error);
      }
    } catch (error) {
      console.error('Error generating letter:', error);
      this.ui.error('שגיאה בהפקת המכתב');
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    this.dialogRef.close(null);
  }
}
