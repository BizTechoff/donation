import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogRef } from '@angular/material/dialog';
import { remult } from 'remult';
import { Organization, Place } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { AddressComponents, OsmAddressInputComponent } from '../../../common/osm-address-input/osm-address-input.component';

export interface OrganizationDetailsModalArgs {
  organizationId?: string; // undefined for new organization, or organization ID for edit
}

@Component({
  selector: 'app-organization-details-modal',
  templateUrl: './organization-details-modal.component.html',
  styleUrls: ['./organization-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SharedComponentsModule,
    OsmAddressInputComponent
  ]
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
          include: { place: true }
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
      await this.organization.save();

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
    if (!this.organization?.place) return undefined;

    return {
      fullAddress: this.organization.place.getDisplayAddress(),
      street: this.organization.place.street || '',
      houseNumber: this.organization.place.houseNumber || '',
      city: this.organization.place.city || '',
      state: this.organization.place.state || '',
      country: this.organization.place.country || '',
      countryCode: this.organization.place.countryCode || '',
      postcode: this.organization.place.postcode || '',
      neighborhood: this.organization.place.neighborhood || ''
    };
  }

  async onAddressSelected(addressComponents: AddressComponents) {
    if (!this.organization) return;

    try {
      // Check if place already exists
      if (this.organization.placeId && this.organization.place) {
        // Update existing place
        const place = this.organization.place;
        place.street = addressComponents.street || '';
        place.houseNumber = addressComponents.houseNumber || '';
        place.city = addressComponents.city || '';
        place.state = addressComponents.state || '';
        place.country = addressComponents.country || '';
        place.countryCode = addressComponents.countryCode || '';
        place.postcode = addressComponents.postcode || '';
        place.neighborhood = addressComponents.neighborhood || '';

        await remult.repo(Place).save(place);
      } else {
        // Create new place
        const newPlace = this.placeRepo.create({
          street: addressComponents.street || '',
          houseNumber: addressComponents.houseNumber || '',
          city: addressComponents.city || '',
          state: addressComponents.state || '',
          country: addressComponents.country || '',
          countryCode: addressComponents.countryCode || '',
          postcode: addressComponents.postcode || '',
          neighborhood: addressComponents.neighborhood || ''
        });

        const savedPlace = await remult.repo(Place).save(newPlace);
        this.organization.placeId = savedPlace.id;
        this.organization.place = savedPlace;
      }

      this.onFieldChange();
    } catch (error) {
      console.error('Error saving address:', error);
      this.ui.error('שגיאה בשמירת הכתובת');
    }
  }
}
