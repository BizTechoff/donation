import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Country } from '../../../../shared/entity/country';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface CountryDetailsModalArgs {
  countryId?: string; // undefined for new country, or country ID for edit
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '80vh'
})
@Component({
  selector: 'app-country-details-modal',
  templateUrl: './country-details-modal.component.html',
  styleUrls: ['./country-details-modal.component.scss']
})
export class CountryDetailsModalComponent implements OnInit {
  args!: CountryDetailsModalArgs;

  country?: Country;
  countryRepo = remult.repo(Country);

  loading = false;
  isNew = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<CountryDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeCountry();
  }

  private async initializeCountry() {
    this.loading = true;
    try {
      if (!this.args?.countryId || this.args.countryId === 'new') {
        // New country
        this.isNew = true;
        this.country = this.countryRepo.create();
        this.country.isActive = true;
      } else {
        // Edit existing country
        this.isNew = false;
        const loadedCountry = await this.countryRepo.findId(this.args.countryId, {
          useCache: false
        });

        if (!loadedCountry) {
          this.ui.error('שגיאה בטעינת נתוני המדינה');
          this.dialogRef.close();
          return;
        }

        this.country = loadedCountry;
      }
    } catch (error) {
      console.error('Error initializing country:', error);
      this.ui.error('שגיאה בטעינת נתוני המדינה');
    } finally {
      this.loading = false;
    }
  }

  async save() {
    if (!this.country) return;

    // Validation
    if (!this.country.name || this.country.name.trim() === '') {
      this.ui.error('נא להזין שם מדינה');
      return;
    }

    try {
      await this.countryRepo.save(this.country);
      this.ui.info(this.isNew ? 'המדינה נוצרה בהצלחה' : 'המדינה עודכנה בהצלחה');
      this.dialogRef.close(this.country);
    } catch (error) {
      console.error('Error saving country:', error);
      this.ui.error('שגיאה בשמירת המדינה');
    }
  }

  async delete() {
    if (!this.country || this.isNew) return;

    const confirmed = await this.ui.yesNoQuestion('האם אתה בטוח שברצונך למחוק מדינה זו?');
    if (!confirmed) return;

    try {
      await this.countryRepo.delete(this.country);
      this.ui.info('המדינה נמחקה בהצלחה');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error deleting country:', error);
      this.ui.error('שגיאה במחיקת המדינה');
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
