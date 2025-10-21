import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Letter } from '../../../../shared/enum/letter';
import { LetterService } from '../../../services/letter.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { remult } from 'remult';
import { Donation } from '../../../../shared/entity';
import { HDate } from '@hebcal/core';

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

  // Available letter types
  letterTypes: Letter[] = [];
  selectedLetterType?: Letter;

  // Prefix options (opening lines)
  availablePrefixLines: string[] = [
    'כבוד ידידנו הנדיב הנכבד, אוהב תורה ורודף חסד'
  ];
  selectedPrefixLines: string[] = [];
  customPrefixLine = '';

  // Suffix options (closing lines)
  availableSuffixLines: string[] = [
    'א כשר און א פרייליכען פסח',
    'א פרייליכען יום טוב',
    'בברכת גמר חתימה טובה',
    'בברכת הצלחה רבה וכט"ס',
    'בברכת כתיבה וחתימה טובה',
    'ביקרא דאורייתא וכט"ס'
  ];
  selectedSuffixLines: string[] = [];
  customSuffixLine = '';

  loading = false;

  // Donation data
  donation?: Donation;
  fieldValues: FieldValue[] = [];

  constructor(
    private letterService: LetterService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<LetterPropertiesModalComponent>
  ) {}

  async ngOnInit() {
    this.loadLetterTypes();
    await this.loadDonation();
  }

  async loadDonation() {
    if (!this.args?.donationId) return;

    try {
      this.loading = true;
      const donationRepo = remult.repo(Donation);
      this.donation = await donationRepo.findId(this.args.donationId, {
        include: { donor: true, campaign: true }
      }) || undefined;

      if (this.donation) {
        this.updateFieldValues();
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
    // Select first type by default
    if (this.letterTypes.length > 0) {
      this.selectedLetterType = this.letterTypes[0];
      this.updateFieldValues();
    }
  }

  selectLetterType(type: Letter) {
    this.selectedLetterType = type;
    this.updateFieldValues();
  }

  updateFieldValues() {
    if (!this.selectedLetterType || !this.donation) {
      this.fieldValues = [];
      return;
    }

    this.fieldValues = this.selectedLetterType.fields
      .filter(field => field !== 'letter_prefix' && field !== 'letter_suffix')
      .map(field => ({
        fieldName: field,
        displayName: this.getFieldDisplayName(field),
        value: this.getFieldValue(field)
      }))
      .filter(fv => fv.value.trim().length > 0);
  }

  getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
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

  getFieldValue(field: string): string {
    if (!this.donation) return '';

    switch (field) {
      case 'letter_heb_date': {
        const hDate = new HDate(new Date());
        return hDate.renderGematriya();
      }
      case 'donor_eng_title':
        return this.donation.donor?.titleEnglish || '';
      case 'donor_eng_first_name':
        return this.donation.donor?.firstNameEnglish || '';
      case 'donor_eng_last_name':
        return this.donation.donor?.lastNameEnglish || '';
      case 'donor_eng_suffix':
        return this.donation.donor?.suffixEnglish || '';
      case 'donor_home_address':
        return this.donation.donor?.homePlace?.fullAddress || '';
      case 'donor_country':
        return this.donation.donor?.homePlace?.country?.name || '';
      case 'donor_title':
        return this.donation.donor?.title || '';
      case 'donor_first_name':
        return this.donation.donor?.firstName || '';
      case 'donor_last_name':
        return this.donation.donor?.lastName || '';
      case 'donor_suffix':
        return this.donation.donor?.suffix || '';
      case 'donation_amount':
        return this.donation.amount.toString();
      case 'donation_reason':
        return this.donation.reason || '';
      case 'donation_currency_symbol': {
        const currencySymbols: Record<string, string> = {
          'ILS': '₪',
          'USD': '$',
          'EUR': '€',
          'GBP': '£',
          'JPY': '¥'
        };
        return currencySymbols[this.donation.currency || 'ILS'] || this.donation.currency || '₪';
      }
      default:
        return '';
    }
  }

  // Prefix management
  addPrefixLine(line: string) {
    if (line && !this.selectedPrefixLines.includes(line)) {
      this.selectedPrefixLines.push(line);
    }
  }

  addCustomPrefixLine() {
    if (this.customPrefixLine.trim()) {
      this.addPrefixLine(this.customPrefixLine.trim());
      this.customPrefixLine = '';
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
  addSuffixLine(line: string) {
    if (line && !this.selectedSuffixLines.includes(line)) {
      this.selectedSuffixLines.push(line);
    }
  }

  addCustomSuffixLine() {
    if (this.customSuffixLine.trim()) {
      this.addSuffixLine(this.customSuffixLine.trim());
      this.customSuffixLine = '';
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

      const response = await this.letterService.createLetter(
        this.args.donationId,
        this.selectedLetterType,
        this.selectedPrefixLines,
        this.selectedSuffixLines
      );

      if (response.success) {
        this.ui.info('מכתב הופק והורד בהצלחה');
        this.dialogRef.close({
          selectedType: this.selectedLetterType,
          prefix: this.selectedPrefixLines,
          suffix: this.selectedSuffixLines
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
