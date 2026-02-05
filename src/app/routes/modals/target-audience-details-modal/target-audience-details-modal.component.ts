import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { TargetAudience } from '../../../../shared/entity/target-audience';
import { TargetAudienceController } from '../../../../shared/controllers/target-audience.controller';
import { DonorMapData } from '../../../../shared/controllers/donor-map.controller';
import { DonorService } from '../../../services/donor.service';
import { Donor } from '../../../../shared/entity/donor';
import { HebrewDateService } from '../../../services/hebrew-date.service';

export interface TargetAudienceDetailsModalArgs {
  targetAudienceId?: string; // undefined for 'new'
  initialDonors?: DonorMapData[]; // For creating new audience
  polygonPoints?: { lat: number; lng: number }[];
  metadata?: any;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '1000px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-target-audience-details-modal',
  templateUrl: './target-audience-details-modal.component.html',
  styleUrls: ['./target-audience-details-modal.component.scss']
})
export class TargetAudienceDetailsModalComponent implements OnInit {
  args!: TargetAudienceDetailsModalArgs;

  // State
  targetAudience?: TargetAudience;
  isNewAudience = true;
  isLoading = false;
  isSaving = false;

  // Form fields
  name = '';
  description = '';

  // Donors
  donorMapData: DonorMapData[] = [];

  // Tabs
  selectedTabIndex = 0;

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<any>,
    private donorService: DonorService,
    private hebrewDateService: HebrewDateService
  ) {}

  async ngOnInit() {
    if (this.args.targetAudienceId && this.args.targetAudienceId !== 'new') {
      // Edit mode
      this.isNewAudience = false;
      this.selectedTabIndex = 1; // Go directly to donors tab
      await this.loadTargetAudience();
    } else {
      // Create mode
      this.isNewAudience = true;
      if (this.args.initialDonors) {
        this.donorMapData = this.args.initialDonors;
      }
    }
  }

  async loadTargetAudience() {
    this.isLoading = true;
    try {
      const result = await TargetAudienceController.getTargetAudienceWithDonors(this.args.targetAudienceId!);
      this.targetAudience = result.targetAudience;
      this.name = this.targetAudience.name;
      this.description = this.targetAudience.description || '';

      // Load donor map data
      if (this.targetAudience.donorIds && this.targetAudience.donorIds.length > 0) {
        this.donorMapData = await this.donorService.loadDonorsMapDataByIds(this.targetAudience.donorIds);
      }
    } catch (error) {
      this.ui.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  // Filter donors based on search term
  getFilteredDonors(): DonorMapData[] {
    if (!this.searchTerm.trim()) {
      return this.donorMapData;
    }

    const term = this.searchTerm.toLowerCase();
    return this.donorMapData.filter(donorData =>
      donorData.donor.firstName?.toLowerCase().includes(term) ||
      donorData.donor.lastName?.toLowerCase().includes(term) ||
      donorData.donor.fullName?.toLowerCase().includes(term) ||
      donorData.fullAddress?.toLowerCase().includes(term) ||
      donorData.email?.toLowerCase().includes(term)
    );
  }

  // Add donors
  async addDonors() {
    const donors = await openDialog(
      (await import('../donor-selection-modal/donor-selection-modal.component')).DonorSelectionModalComponent,
      (modal) => {
        modal.args = {
          title: 'בחר תורמים להוספה',
          multiSelect: true,
          excludeIds: this.donorMapData.map(d => d.donor.id)
        };
      }
    );

    if (donors && Array.isArray(donors) && donors.length > 0) {
      const donorIds = donors.map((d: Donor) => d.id);
      const newDonorsData = await this.donorService.loadDonorsMapDataByIds(donorIds);
      this.donorMapData = [...this.donorMapData, ...newDonorsData];

      // If editing existing audience, save immediately
      if (!this.isNewAudience && this.targetAudience) {
        await this.saveDonorChanges();
      }
    }
  }

  // Remove donor
  async removeDonor(donorId: string) {
    this.donorMapData = this.donorMapData.filter(d => d.donor.id !== donorId);

    // If editing existing audience, save immediately
    if (!this.isNewAudience && this.targetAudience) {
      await this.saveDonorChanges();
    }
  }

  // Save donor changes (for existing audiences)
  async saveDonorChanges() {
    if (!this.targetAudience) return;

    try {
      const donorIds = this.donorMapData.map(d => d.donor.id);
      await TargetAudienceController.updateTargetAudience(this.targetAudience.id, { donorIds });
      this.ui.info('רשימת התורמים עודכנה בהצלחה');
    } catch (error) {
      this.ui.error(error);
    }
  }

  // Open donor details
  async openDonorDetails(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      // Optionally refresh donor data
      await this.refreshDonorData(donorId);
    }
  }

  // Refresh specific donor data
  async refreshDonorData(donorId: string) {
    const updatedData = await this.donorService.loadDonorsMapDataByIds([donorId]);
    if (updatedData.length > 0) {
      const index = this.donorMapData.findIndex(d => d.donor.id === donorId);
      if (index >= 0) {
        this.donorMapData[index] = updatedData[0];
      }
    }
  }

  // Add donation for donor
  async addDonation(donorId: string) {
    const changed = await this.ui.donationDetailsDialog('new', { donorId });
    if (changed) {
      this.ui.info('התרומה נוספה בהצלחה');
      await this.refreshDonorData(donorId);
    }
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
  }

  // Save (create or update)
  async save() {
    // Validate
    if (!this.name.trim()) {
      this.ui.error('נא להזין שם לקהל היעד');
      return;
    }

    if (this.donorMapData.length === 0) {
      this.ui.error('נא להוסיף לפחות תורם אחד לקהל היעד');
      return;
    }

    this.isSaving = true;
    try {
      const donorIds = this.donorMapData.map(d => d.donor.id);

      if (this.isNewAudience) {
        // Create new
        const metadata = this.args.metadata || this.calculateMetadata();
        const newAudience = await TargetAudienceController.createTargetAudience(
          this.name.trim(),
          this.description.trim(),
          donorIds,
          this.args.polygonPoints,
          metadata
        );

        this.ui.info('קהל היעד נוצר בהצלחה');
        this.dialogRef.close(newAudience);
      } else {
        // Update existing
        await TargetAudienceController.updateTargetAudience(this.targetAudience!.id, {
          name: this.name.trim(),
          description: this.description.trim(),
          donorIds
        });

        this.ui.info('קהל היעד עודכן בהצלחה');
        this.dialogRef.close(true);
      }
    } catch (error) {
      this.ui.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  // Calculate metadata
  calculateMetadata() {
    const totalDonations = this.getTotalDonationsSum();
    const donorCount = this.donorMapData.length;

    return {
      source: this.args.polygonPoints ? 'map_polygon' : 'manual',
      totalDonations,
      averageDonation: donorCount > 0 ? totalDonations / donorCount : 0,
      createdFrom: 'Target Audience Details Modal',
      hasPolygonData: !!this.args.polygonPoints
    };
  }

  // Close dialog
  closeDialog() {
    this.dialogRef.close();
  }

  // Get marker color based on status
  getMarkerColor(status: string): string {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#95a5a6';
      case 'high-donor': return '#f39c12';
      case 'recent-donor': return '#e74c3c';
      default: return '#27ae60';
    }
  }

  // Get status label
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'פעיל';
      case 'inactive': return 'לא פעיל';
      case 'high-donor': return 'תורם גדול';
      case 'recent-donor': return 'תרם לאחרונה';
      default: return status;
    }
  }

  // Get total donations sum
  getTotalDonationsSum(): number {
    return this.donorMapData.reduce((sum, d) => sum + d.stats.totalDonations, 0);
  }

  // Get total donations grouped by currency
  getTotalDonationsByCurrency(): Array<{ symbol: string; total: number }> {
    const byCurrency: { [key: string]: { symbol: string; total: number } } = {};
    for (const d of this.donorMapData) {
      for (const c of d.stats.totalDonationsByCurrency) {
        if (!byCurrency[c.currencyId]) {
          byCurrency[c.currencyId] = { symbol: c.symbol, total: 0 };
        }
        byCurrency[c.currencyId].total += c.total;
      }
    }
    return Object.values(byCurrency);
  }

  // Get total donation count
  getTotalDonationCount(): number {
    return this.donorMapData.reduce((sum, d) => sum + d.stats.donationCount, 0);
  }

  // Format Hebrew date
  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error converting date to Hebrew:', error);
      return new Date(date).toLocaleDateString('he-IL');
    }
  }
}
