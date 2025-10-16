import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { remult } from 'remult';
import { Organization, Country } from '../../../../shared/entity';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

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
    SharedComponentsModule
  ]
})
export class OrganizationDetailsModalComponent implements OnInit {
  args!: OrganizationDetailsModalArgs;
  changed = false;
  shouldClose = false;

  organization?: Organization;
  originalOrganizationData?: string;
  countries: Country[] = [];

  organizationRepo = remult.repo(Organization);
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
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadCountries();
    await this.initializeOrganization();
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
        this.organization = await this.organizationRepo.findId(this.args.organizationId, { useCache: false }) || undefined;

        if (this.organization) {
          this.originalOrganizationData = JSON.stringify(this.organization);
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
      this.shouldClose = true;
      this.cdr.detectChanges();
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
      this.shouldClose = true;
      this.cdr.detectChanges();
    } else if (!event) {
      // Direct close button click
      if (this.hasChanges()) {
        if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
          return;
        }
      }
      this.shouldClose = true;
      this.cdr.detectChanges();
    }
  }

  onFieldChange() {
    this.changed = true;
  }

  // Helper method to get selected country
  getSelectedCountry(): Country | undefined {
    if (!this.organization?.countryId) return undefined;
    return this.countries.find(c => c.id === this.organization!.countryId);
  }
}
