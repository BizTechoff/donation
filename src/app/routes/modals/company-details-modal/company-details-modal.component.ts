import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Company, Place } from '../../../../shared/entity';
import { AddressComponents } from '../../../common/osm-address-input/osm-address-input.component';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';

export interface CompanyDetailsModalArgs {
  companyId?: string; // undefined for new company, or company ID for edit
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '900px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-company-details-modal',
  templateUrl: './company-details-modal.component.html',
  styleUrls: ['./company-details-modal.component.scss']
})
export class CompanyDetailsModalComponent implements OnInit {
  args!: CompanyDetailsModalArgs;
  changed = false;

  company?: Company;
  originalCompanyData?: string;

  companyRepo = remult.repo(Company);
  placeRepo = remult.repo(Place);

  loading = false;
  isNew = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CompanyDetailsModalComponent>
  ) { }

  async ngOnInit() {
    await this.initializeCompany();

    // Prevent accidental close for new company
    if (this.isNew) {
      this.dialogRef.disableClose = true;
    }
  }

  private async initializeCompany() {
    this.loading = true;
    try {
      if (!this.args?.companyId) {
        // New company
        this.isNew = true;
        this.company = this.companyRepo.create();
        this.company.isActive = true;
        this.originalCompanyData = JSON.stringify(this.company);
      } else {
        // Edit existing company
        this.isNew = false;
        this.company = await this.companyRepo.findId(this.args.companyId, {
          useCache: false,
          include: { place: { include: { country: true } } }
        }) || undefined;

        if (this.company) {
          this.originalCompanyData = JSON.stringify(this.company);
          this.cdr.detectChanges();
        } else {
          console.error('Failed to load company with ID:', this.args.companyId);
          this.ui.error('שגיאה בטעינת נתוני החברה');
        }
      }
    } catch (error) {
      console.error('Error initializing company:', error);
      this.ui.error('שגיאה בטעינת נתוני החברה');
    } finally {
      this.loading = false;
    }
  }

  private hasChanges(): boolean {
    if (!this.company || !this.originalCompanyData) return false;
    return JSON.stringify(this.company) !== this.originalCompanyData;
  }

  async save() {
    if (!this.company) return;

    // Validate required fields
    if (!this.company.name?.trim()) {
      this.ui.error('שם החברה הוא שדה חובה');
      return;
    }

    try {
      this.loading = true;
      await remult.repo(Company).save(this.company);

      this.ui.info(this.isNew ? 'החברה נוספה בהצלחה' : 'החברה עודכנה בהצלחה');

      this.changed = true;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving company:', error);
      this.ui.error('שגיאה בשמירת החברה');
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

  getAddressComponents(): AddressComponents | undefined {
    if (!this.company?.place) return undefined;
    const place = this.company.place;

    return {
      fullAddress: typeof place.getDisplayAddress === 'function' ? place.getDisplayAddress() : place.fullAddress || '',
      street: this.company.place.street || '',
      houseNumber: this.company.place.houseNumber || '',
      city: this.company.place.city || '',
      state: this.company.place.state || '',
      country: this.company.place.country,
      countryCode: this.company.place.country?.code || '',
      postcode: this.company.place.postcode || '',
      neighborhood: this.company.place.neighborhood || ''
    };
  }

  async onPlaceSelected(place: Place | undefined) {
    if (!this.company) return;

    this.company.placeId = place?.id || '';
    this.company.place = place;
    this.onFieldChange();
  }
}
