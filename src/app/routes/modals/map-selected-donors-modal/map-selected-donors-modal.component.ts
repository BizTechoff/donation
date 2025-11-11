import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { DonorMapData } from '../../../../shared/controllers/donor-map.controller';
import { Donor } from '../../../../shared/entity/donor';
import { DonorService } from '../../../services/donor.service';
import { HebrewDateService } from '../../../services/hebrew-date.service';

export interface MapSelectedDonorsModalArgs {
  donors: DonorMapData[];
  polygonPoints?: { lat: number; lng: number }[];
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '900px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-map-selected-donors-modal',
  templateUrl: './map-selected-donors-modal.component.html',
  styleUrls: ['./map-selected-donors-modal.component.scss']
})
export class MapSelectedDonorsModalComponent implements OnInit {
  args!: MapSelectedDonorsModalArgs;
  selectedDonors: DonorMapData[] = [];

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
    this.selectedDonors = this.args.donors || [];
  }

  // Filter donors based on search term
  getFilteredDonors(): DonorMapData[] {
    if (!this.searchTerm.trim()) {
      return this.selectedDonors;
    }

    const term = this.searchTerm.toLowerCase();
    return this.selectedDonors.filter(donorData =>
      donorData.donor.firstName?.toLowerCase().includes(term) ||
      donorData.donor.lastName?.toLowerCase().includes(term) ||
      donorData.donor.fullName?.toLowerCase().includes(term) ||
      donorData.fullAddress?.toLowerCase().includes(term) ||
      donorData.email?.toLowerCase().includes(term)
    );
  }

  // Open donor details
  async openDonorDetails(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      // Optionally close the modal or refresh data
      // For now, just keep it open
    }
  }

  // Add donation for donor
  async addDonation(donorId: string) {
    const changed = await this.ui.donationDetailsDialog('new', { donorId });
    if (changed) {
      // Donation added successfully
      this.ui.info('התרומה נוספה בהצלחה');
    }
  }

  // Add donors to the list
  async addDonors() {
    // Open donor selection modal
    const donors = await openDialog(
      (await import('../donor-selection-modal/donor-selection-modal.component')).DonorSelectionModalComponent,
      (modal) => {
        modal.args = {
          title: 'בחר תורמים להוספה',
          multiSelect: true,
          excludeIds: this.selectedDonors.map(d => d.donor.id)
        };
      }
    );

    if (donors && Array.isArray(donors) && donors.length > 0) {
      // Get donor IDs
      const donorIds = donors.map((d: Donor) => d.id);

      // Load full donor data with stats
      const newDonorsData = await this.donorService.loadDonorsMapData(donorIds);

      // Add to existing list
      this.selectedDonors = [...this.selectedDonors, ...newDonorsData];

      this.ui.info(`נוספו ${donors.length} תורמים`);
    }
  }

  // Remove donor from list
  removeDonor(donorId: string) {
    this.selectedDonors = this.selectedDonors.filter(d => d.donor.id !== donorId);
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
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

  // Export to Excel (future feature)
  exportToExcel() {
    this.ui.info('פיצ׳ר בפיתוח - ייצוא לאקסל');
    // TODO: Implement Excel export
  }

  // Get total donations sum
  getTotalDonationsSum(): number {
    return this.selectedDonors.reduce((sum, d) => sum + d.stats.totalDonations, 0);
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

  // Save as target audience
  async saveAsTargetAudience() {
    // Calculate metadata
    const totalDonations = this.getTotalDonationsSum();
    const donorCount = this.selectedDonors.length;

    const metadata = {
      source: 'map_polygon',
      totalDonations,
      averageDonation: donorCount > 0 ? totalDonations / donorCount : 0,
      createdFrom: 'Map Selection',
      hasPolygonData: !!this.args.polygonPoints
    };

    // Open TargetAudienceDetailsModal with the current donors
    const result = await this.ui.targetAudienceDetailsDialog('new', {
      initialDonors: this.selectedDonors,
      polygonPoints: this.args.polygonPoints,
      metadata
    });

    if (result) {
      // Successfully saved
      this.ui.info('קהל היעד נשמר בהצלחה');
      // Optionally close the current modal
      this.dialogRef.close(result);
    }
  }
}
