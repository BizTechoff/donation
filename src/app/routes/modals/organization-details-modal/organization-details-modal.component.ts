import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Organization, Place } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { AddressComponents } from '../../../common/osm-address-input/osm-address-input.component';

export interface OrganizationDetailsModalArgs {
  organizationId?: string; // undefined for new organization, or organization ID for edit
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '80vw',
  maxHeight: '80vh',
  panelClass: 'organization-details-dialog-panel'
})
@Component({
  selector: 'app-organization-details-modal',
  templateUrl: './organization-details-modal.component.html',
  styleUrls: ['./organization-details-modal.component.scss']
})
export class OrganizationDetailsModalComponent implements OnInit {
  args!: OrganizationDetailsModalArgs;
  changed = false;

  organization?: Organization;
  originalOrganizationData?: string;

  organizationRepo = remult.repo(Organization);
  placeRepo = remult.repo(Place);

  loading = false;
  isNew = false;

  // Currency options - dynamically generated from terms
  get currencyOptions() {
    return [
      { value: 'ILS', label: this.i18n.terms.currencyILS },
      { value: 'USD', label: this.i18n.terms.currencyUSD },
      { value: 'EUR', label: this.i18n.terms.currencyEUR },
      { value: 'GBP', label: this.i18n.terms.currencyGBP },
      { value: 'CAD', label: this.i18n.terms.currencyCAD },
      { value: 'AUD', label: this.i18n.terms.currencyAUD }
    ];
  }

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<OrganizationDetailsModalComponent>
  ) {}

  async ngOnInit() {
    await this.initializeOrganization();
  }

  private async initializeOrganization() {
    this.loading = true;
    try {
      if (!this.args?.organizationId) {
        // New organization
        this.isNew = true;
        this.organization = this.organizationRepo.create();
        this.organization.currency = 'ILS';
        this.organization.isActive = true;
        this.originalOrganizationData = JSON.stringify(this.organization);
      } else {
        // Edit existing organization
        this.isNew = false;
        this.organization = await this.organizationRepo.findId(this.args.organizationId, {
          useCache: false,
          include: { place: { include: { country: true } } }
        }) || undefined;

        if (this.organization) {
          this.originalOrganizationData = JSON.stringify(this.organization);
          this.cdr.detectChanges();
        } else {
          console.error('Failed to load organization with ID:', this.args.organizationId);
          this.ui.error('שגיאה בטעינת נתוני העמותה');
        }
      }
    } catch (error) {
      console.error('Error initializing organization:', error);
      this.ui.error('שגיאה בטעינת נתוני העמותה');
    } finally {
      this.loading = false;
    }
  }

  private hasChanges(): boolean {
    if (!this.organization || !this.originalOrganizationData) return false;
    return JSON.stringify(this.organization) !== this.originalOrganizationData;
  }

  async save() {
    if (!this.organization) return;

    // Validate required fields
    if (!this.organization.name?.trim()) {
      this.ui.error('שם העמותה הוא שדה חובה');
      return;
    }

    try {
      this.loading = true;

      // Use remult.repo for saving in app context
      if (this.isNew) {
        await this.organizationRepo.insert(this.organization);
      } else {
        await this.organizationRepo.save(this.organization);
      }

      this.ui.info(this.isNew ? 'העמותה נוספה בהצלחה' : 'העמותה עודכנה בהצלחה');

      this.changed = true;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving organization:', error);
      this.ui.error('שגיאה בשמירת העמותה');
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    if (this.hasChanges()) {
      if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
        return;
      }
    }
    this.dialogRef.close(this.changed);
  }

  onFieldChange() {
    this.changed = true;
  }

  getAddressComponents(): AddressComponents | undefined {
    if (!this.organization?.place) return undefined;

    return {
      fullAddress: this.organization.place.getDisplayAddress(),
      street: this.organization.place.street || '',
      houseNumber: this.organization.place.houseNumber || '',
      city: this.organization.place.city || '',
      state: this.organization.place.state || '',
      country: this.organization.place.country ,
      countryCode: this.organization.place.country?.code || '',
      postcode: this.organization.place.postcode || '',
      neighborhood: this.organization.place.neighborhood || ''
    };
  }

  async onPlaceSelected(place: Place | undefined) {
    if (!this.organization) return;

    this.organization.placeId = place?.id || '';
    this.organization.place = place;
    this.onFieldChange();
  }
}
