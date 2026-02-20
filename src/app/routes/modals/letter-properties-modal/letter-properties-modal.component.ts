import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Company, Donation, DonorPlace, LetterTitle, LetterTitleDefault } from '../../../../shared/entity';
import { Letter } from '../../../../shared/enum/letter';
import { DonationController } from '../../../../shared/controllers/donation.controller';
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
  isEnglish: boolean;
}

export interface SelectedLine {
  id: string;      // LetterTitle id
  text: string;    // הטקסט של הברכה
  isPinned: boolean; // האם נעוץ לסוג מכתב זה
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
  selectedPrefixLines: SelectedLine[] = [];
  customPrefixLine = '';

  // Suffix options (closing lines)
  availableSuffixLines: string[] = [];
  selectedSuffixLines: SelectedLine[] = [];
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

  async selectLetterType(type: Letter) {
    this.selectedPrefixLines.splice(0)
    this.selectedSuffixLines.splice(0)
    this.selectedLetterType = type;
    this.updateFieldValues();
    await this.loadDefaultTitles();
  }

  // טעינת כותרות ברירת מחדל לסוג המכתב הנבחר
  async loadDefaultTitles() {
    if (!this.selectedLetterType) return;

    try {
      const letterTitleDefaultRepo = remult.repo(LetterTitleDefault);
      const letterTitleRepo = remult.repo(LetterTitle);

      // טעינת ברירות מחדל לפתיחה (prefix)
      const prefixDefaults = await letterTitleDefaultRepo.find({
        where: {
          letterName: this.selectedLetterType.caption,
          position: 'prefix'
        },
        orderBy: { sortOrder: 'asc' }
      });

      // טעינת הכותרות עצמן
      for (const def of prefixDefaults) {
        const title = await letterTitleRepo.findId(def.letterTitleId);
        if (title && title.active && !this.selectedPrefixLines.some(l => l.id === title.id)) {
          this.selectedPrefixLines.push({
            id: title.id,
            text: title.text,
            isPinned: true
          });
        }
      }

      // טעינת ברירות מחדל לסגירה (suffix)
      const suffixDefaults = await letterTitleDefaultRepo.find({
        where: {
          letterName: this.selectedLetterType.caption,
          position: 'suffix'
        },
        orderBy: { sortOrder: 'asc' }
      });

      // טעינת הכותרות עצמן
      for (const def of suffixDefaults) {
        const title = await letterTitleRepo.findId(def.letterTitleId);
        if (title && title.active && !this.selectedSuffixLines.some(l => l.id === title.id)) {
          this.selectedSuffixLines.push({
            id: title.id,
            text: title.text,
            isPinned: true
          });
        }
      }
    } catch (error) {
      console.error('Error loading default titles:', error);
    }
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
      .filter(field => field !== 'letter_prefix' && field !== 'letter_suffix' && field !== 'תואר_מלא' && field !== 'סיומת_מכתב')
      .map(async field => ({
        fieldName: field,
        displayName: this.getFieldDisplayName(field),
        value: await this.getFieldValue(field),
        isMultiline: this.isMultilineField(field),
        isEnglish: this.isEnglishField(field)
      }));

    const allFields = await Promise.all(fieldPromises);
    this.fieldValues = allFields;
  }

  isMultilineField(field: string): boolean {
    const multilineFields = ['FullAddress', 'תואר_מלא', 'סיומת_מכתב'];
    return multilineFields.includes(field);
  }

  isEnglishField(field: string): boolean {
    // שדות כתובת הם תמיד LTR (אנגלית/מספרים)
    const englishFields = ['FullAddress', 'FullAddress_Work', 'FullCity_Work'];
    return englishFields.includes(field);
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
      'FullAddress': 'כתובת מלאה',
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
        // Use receiptNumber (auto-assigned running number)
        let receiptNum = this.donation.receiptNumber;
        if (!receiptNum) {
          // Assign next receipt number if not already set
          receiptNum = await DonationController.assignReceiptNumber(this.donation.id);
          this.donation.receiptNumber = receiptNum;
        }
        result = '00000000' + receiptNum;
        result = result.slice(-8);
        break
      }
      case 'Name_receipt': {
        result = this.donation.payerName
        break
      }
      case 'FullAddress_Work': {
        // Check if payer is the donor or a company
        const donorFullName = `${this.donation.donor?.firstName || ''} ${this.donation.donor?.lastName || ''}`.trim();
        let place;

        if (this.donation.payerName === donorFullName) {
          // Payer is the donor - use donor's primary address
          const donorPlace = await DonorPlace.getPrimaryForDonor(this.donation.donorId || '');
          place = donorPlace?.place;
        } else {
          const company = await remult.repo(Company).findFirst({ name: this.donation.payerName }, { include: { place: { include: { country: true } } } });
          if (company) {
            place = company.place;
          }
        }

        if (place) {
          // שימוש בפונקציה המרכזית לשורת רחוב
          result = place.getStreetLine();
        }
        break
      }
      case 'FullCity_Work': {
        // Check if payer is the donor or a company
        const donorFullName = `${this.donation.donor?.firstName || ''} ${this.donation.donor?.lastName || ''}`.trim();
        let place;

        if (this.donation.payerName === donorFullName) {
          // Payer is the donor - use donor's primary address
          const donorPlace = await DonorPlace.getPrimaryForDonor(this.donation.donorId || '');
          place = donorPlace?.place;
        } else {
          const company = await remult.repo(Company).findFirst({ name: this.donation.payerName }, { include: { place: { include: { country: true } } } });
          if (company) {
            place = company.place;
          }
        }

        if (place) {
          // שימוש בפונקציה המרכזית לשורת עיר
          result = place.getCityLine();
        }
        break
      }
      case 'FullAddress': {
        // שורה 1: שם מלא של התורם
        const donorName =
          `${this.donation.donor?.titleEnglish} ${this.donation.donor?.maritalStatus === 'married' && !this.donation.donor?.titleEnglish?.includes('Mrs.') ? '& Mrs.' : ''} ${this.donation.donor?.firstNameEnglish[0]?.toUpperCase()} ${this.toCamelCase(this.donation.donor?.lastNameEnglish || '')}`.trim() || '';

        // קבלת הכתובת הראשית של התורם
        const donorPlace = await DonorPlace.getPrimaryForDonor(this.donation.donorId || '');
        const place = donorPlace?.place;

        if (place) {
          // שורות 2-5: כתובת מהפונקציות המרכזיות
          const addressLines = place.getAddressForLetter();
          const allLines = [donorName, ...addressLines];
          result = allLines.filter(line => line && line.trim().length > 0).join('\n');
        } else {
          result = donorName;
        }

        break
      }

      // ===== Hebrew Common Fields =====
      case 'תואר_עברית': {
        result = `${this.donation.donor?.title || ''}`
        break
      }
      case 'תואר  מלא': { // Handle typo in some templates
        result = `${this.donation.donor?.title || ''}`
        break
      }
      case 'תואר_מלא': {
        result = this.selectedPrefixLines.map(l => l.text).join('\n');
        break
      }
      case 'שם_עברית': {
        result = this.donation.donor?.firstName || ''
        result = result.trim()
        if (this.donation.donor?.lineage) {
          if (this.donation.donor.lineage !== 'israel') {
            if (this.donation.donor.lineage === 'levi') {
              result += ' הלוי '
            }
            else if (this.donation.donor.lineage === 'cohen') {
              result += ' הכהן '
            }
          }
        }
        result = result.trim()
        result += ` ${this.donation.donor?.lastName || ''}`
        result = result.trim()
        break
      }
      case 'סיומת_עברית': {
        result = `${this.donation.donor?.suffix || ''}`
        break
      }
      case 'סיומת_מכתב': {
        result = this.selectedSuffixLines.map(l => l.text).join('\n');
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
        result = currencySymbols[this.donation.currencyId || 'ILS'] || this.donation.currencyId || '₪';
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
      it.args = {
        type: 'prefix',
        letterName: this.selectedLetterType?.caption
      };
    }) as LetterTitle | null;

    if (result && result.text && !this.selectedPrefixLines.some(l => l.id === result.id)) {
      this.selectedPrefixLines.push({
        id: result.id,
        text: result.text,
        isPinned: false
      });
    }
  }

  addPrefixLine(line: string) {
    if (line && !this.selectedPrefixLines.some(l => l.text === line)) {
      this.selectedPrefixLines.push({
        id: '',
        text: line,
        isPinned: false
      });
    }
  }

  removePrefixLine(index: number) {
    const line = this.selectedPrefixLines[index];
    if (line.isPinned) {
      this.ui.info('לא ניתן להסיר ברכה נעוצה. בטל קודם את הנעיצה.');
      return;
    }
    this.selectedPrefixLines.splice(index, 1);
  }

  async movePrefixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index - 1];
      this.selectedPrefixLines[index - 1] = temp;
      await this.updatePinnedSortOrder('prefix');
    }
  }

  async movePrefixLineDown(index: number) {
    if (index < this.selectedPrefixLines.length - 1) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index + 1];
      this.selectedPrefixLines[index + 1] = temp;
      await this.updatePinnedSortOrder('prefix');
    }
  }

  // Toggle pin for prefix line
  async togglePrefixPin(index: number) {
    const line = this.selectedPrefixLines[index];
    if (!line.id || !this.selectedLetterType) {
      this.ui.info('לא ניתן לנעוץ ברכה זו');
      return;
    }

    try {
      this.loading = true;
      const letterTitleDefaultRepo = remult.repo(LetterTitleDefault);

      if (line.isPinned) {
        // הסר נעיצה
        const existing = await letterTitleDefaultRepo.findFirst({
          letterTitleId: line.id,
          letterName: this.selectedLetterType.caption,
          position: 'prefix'
        });
        if (existing) {
          await letterTitleDefaultRepo.delete(existing);
          line.isPinned = false;
          this.ui.info('ברירת המחדל הוסרה');
        }
      } else {
        // הוסף נעיצה
        const maxOrder = await this.getMaxPinnedSortOrder('prefix');
        await letterTitleDefaultRepo.insert({
          letterTitleId: line.id,
          letterName: this.selectedLetterType.caption,
          position: 'prefix',
          sortOrder: maxOrder + 1
        });
        line.isPinned = true;
        this.ui.info('נשמר כברירת מחדל');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      this.ui.error('שגיאה בעדכון ברירת מחדל');
    } finally {
      this.loading = false;
    }
  }

  // Suffix management
  async openSuffixSelectionModal() {
    const result = await openDialog(LetterTitleSelectionModalComponent, (it) => {
      it.args = {
        type: 'suffix',
        letterName: this.selectedLetterType?.caption
      };
    }) as LetterTitle | null;

    if (result && result.text && !this.selectedSuffixLines.some(l => l.id === result.id)) {
      this.selectedSuffixLines.push({
        id: result.id,
        text: result.text,
        isPinned: false
      });
    }
  }

  addSuffixLine(line: string) {
    if (line && !this.selectedSuffixLines.some(l => l.text === line)) {
      this.selectedSuffixLines.push({
        id: '',
        text: line,
        isPinned: false
      });
    }
  }

  removeSuffixLine(index: number) {
    const line = this.selectedSuffixLines[index];
    if (line.isPinned) {
      this.ui.info('לא ניתן להסיר ברכה נעוצה. בטל קודם את הנעיצה.');
      return;
    }
    this.selectedSuffixLines.splice(index, 1);
  }

  async moveSuffixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index - 1];
      this.selectedSuffixLines[index - 1] = temp;
      await this.updatePinnedSortOrder('suffix');
    }
  }

  async moveSuffixLineDown(index: number) {
    if (index < this.selectedSuffixLines.length - 1) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index + 1];
      this.selectedSuffixLines[index + 1] = temp;
      await this.updatePinnedSortOrder('suffix');
    }
  }

  // Toggle pin for suffix line
  async toggleSuffixPin(index: number) {
    const line = this.selectedSuffixLines[index];
    if (!line.id || !this.selectedLetterType) {
      this.ui.info('לא ניתן לנעוץ ברכה זו');
      return;
    }

    try {
      this.loading = true;
      const letterTitleDefaultRepo = remult.repo(LetterTitleDefault);

      if (line.isPinned) {
        // הסר נעיצה
        const existing = await letterTitleDefaultRepo.findFirst({
          letterTitleId: line.id,
          letterName: this.selectedLetterType.caption,
          position: 'suffix'
        });
        if (existing) {
          await letterTitleDefaultRepo.delete(existing);
          line.isPinned = false;
          this.ui.info('ברירת המחדל הוסרה');
        }
      } else {
        // הוסף נעיצה
        const maxOrder = await this.getMaxPinnedSortOrder('suffix');
        await letterTitleDefaultRepo.insert({
          letterTitleId: line.id,
          letterName: this.selectedLetterType.caption,
          position: 'suffix',
          sortOrder: maxOrder + 1
        });
        line.isPinned = true;
        this.ui.info('נשמר כברירת מחדל');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      this.ui.error('שגיאה בעדכון ברירת מחדל');
    } finally {
      this.loading = false;
    }
  }

  // Get max sort order for pinned defaults
  async getMaxPinnedSortOrder(position: 'prefix' | 'suffix'): Promise<number> {
    if (!this.selectedLetterType) return 0;

    const letterTitleDefaultRepo = remult.repo(LetterTitleDefault);
    const defaults = await letterTitleDefaultRepo.find({
      where: {
        letterName: this.selectedLetterType.caption,
        position
      },
      orderBy: { sortOrder: 'desc' },
      limit: 1
    });

    return defaults.length > 0 ? defaults[0].sortOrder : 0;
  }

  // עדכון סדר המיון של כל הברכות הנעוצות לפי הסדר הנוכחי ברשימה
  async updatePinnedSortOrder(position: 'prefix' | 'suffix') {
    if (!this.selectedLetterType) return;

    try {
      const letterTitleDefaultRepo = remult.repo(LetterTitleDefault);
      const lines = position === 'prefix' ? this.selectedPrefixLines : this.selectedSuffixLines;

      // עדכון סדר לכל שורה נעוצה
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.isPinned && line.id) {
          const existing = await letterTitleDefaultRepo.findFirst({
            letterTitleId: line.id,
            letterName: this.selectedLetterType.caption,
            position
          });
          if (existing && existing.sortOrder !== i) {
            existing.sortOrder = i;
            await letterTitleDefaultRepo.save(existing);
          }
        }
      }
    } catch (error) {
      console.error('Error updating sort order:', error);
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

      // Add auto-calculated fields from prefix/suffix lines (only if field exists in letter type)
      if (this.selectedPrefixLines.length > 0 && this.selectedLetterType.fields.includes('תואר_מלא')) {
        fieldValuesMap['תואר_מלא'] = this.selectedPrefixLines.map(l => l.text).join('\n');
      }
      if (this.selectedSuffixLines.length > 0 && this.selectedLetterType.fields.includes('סיומת_מכתב')) {
        fieldValuesMap['סיומת_מכתב'] = this.selectedSuffixLines.map(l => l.text).join('\n');
      }

      const response = await this.letterService.createLetter(
        this.args.donationId,
        this.selectedLetterType,
        fieldValuesMap,
        this.selectedPrefixLines.map(l => l.text),
        this.selectedSuffixLines.map(l => l.text)
      );

      if (response.success) {
        await this.ui.yesNoQuestion('מכתב הופק והורד בהצלחה', false);
        this.dialogRef.close({
          selectedType: this.selectedLetterType,
          prefix: this.selectedPrefixLines.map(l => l.text),
          suffix: this.selectedSuffixLines.map(l => l.text)
        } as LetterPropertiesResult);
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
