import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogRef } from '@angular/material/dialog';
import { remult } from 'remult';
import { Bank, Country } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface BankDetailsModalArgs {
  bankId?: string; // undefined for new bank, or bank ID for edit
}

@Component({
  selector: 'app-bank-details-modal',
  templateUrl: './bank-details-modal.component.html',
  styleUrls: ['./bank-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedComponentsModule
  ]
})
export class BankDetailsModalComponent implements OnInit {
  args!: BankDetailsModalArgs;
  changed = false;

  bank?: Bank;
  originalBankData?: string;
  countries: Country[] = [];

  bankRepo = remult.repo(Bank);
  countryRepo = remult.repo(Country);

  loading = false;
  isNew = false;

  // Currency options
  currencyOptions = [
    { value: 'ILS', label: '₪ - שקל ישראלי (ILS)' },
    { value: 'USD', label: '$ - דולר אמריקאי (USD)' },
    { value: 'EUR', label: '€ - יורו (EUR)' },
    { value: 'GBP', label: '£ - לירה שטרלינג (GBP)' },
    { value: 'CAD', label: 'C$ - דולר קנדי (CAD)' },
    { value: 'AUD', label: 'A$ - דולר אוסטרלי (AUD)' }
  ];

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<BankDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadCountries();
    await this.initializeBank();
  }

  private async loadCountries() {
    try {
      this.countries = await this.countryRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  private async initializeBank() {
    this.loading = true;
    try {
      if (!this.args?.bankId) {
        // New bank
        this.isNew = true;
        this.bank = this.bankRepo.create();
        this.bank.currency = 'ILS';
        this.bank.isActive = true;
        this.originalBankData = JSON.stringify(this.bank);
      } else {
        // Edit existing bank
        this.isNew = false;
        this.bank = await this.bankRepo.findId(this.args.bankId, { useCache: false }) || undefined;

        if (this.bank) {
          this.originalBankData = JSON.stringify(this.bank);
        } else {
          console.error('Failed to load bank with ID:', this.args.bankId);
          this.ui.error('שגיאה בטעינת נתוני הבנק');
        }
      }
    } catch (error) {
      console.error('Error initializing bank:', error);
      this.ui.error('שגיאה בטעינת נתוני הבנק');
    } finally {
      this.loading = false;
    }
  }

  private hasChanges(): boolean {
    if (!this.bank || !this.originalBankData) return false;
    return JSON.stringify(this.bank) !== this.originalBankData;
  }

  async save() {
    if (!this.bank) return;

    // Validate required fields
    if (!this.bank.name?.trim()) {
      this.ui.error('שם הבנק הוא שדה חובה');
      return;
    }

    try {
      this.loading = true;
      await this.bank.save();

      this.ui.info(this.isNew ? 'הבנק נוסף בהצלחה' : 'הבנק עודכן בהצלחה');

      this.changed = true;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving bank:', error);
      this.ui.error('שגיאה בשמירת הבנק');
    } finally {
      this.loading = false;
    }
  }

  closeModal(event?: MouseEvent) {
    // If clicking on overlay, close modal
    if (event && event.target === event.currentTarget) {
      if (this.hasChanges()) {
        if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
          return;
        }
      }
      this.dialogRef.close(this.changed);
    } else if (!event) {
      // Direct close button click
      if (this.hasChanges()) {
        if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
          return;
        }
      }
      this.dialogRef.close(this.changed);
    }
  }

  onFieldChange() {
    this.changed = true;
  }

  // Helper method to get selected country
  getSelectedCountry(): Country | undefined {
    if (!this.bank?.countryId) return undefined;
    return this.countries.find(c => c.id === this.bank!.countryId);
  }
}
