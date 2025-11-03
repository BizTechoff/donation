import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Campaign, Donor, Place } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { DonorService } from '../../../services/donor.service';

export interface CampaignDonorsModalArgs {
  campaignId: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-donors-modal',
  templateUrl: './campaign-donors-modal.component.html',
  styleUrls: ['./campaign-donors-modal.component.scss']
})
export class CampaignDonorsModalComponent implements OnInit {
  args!: CampaignDonorsModalArgs;

  campaign!: Campaign;
  invitedDonors: Donor[] = [];
  loading = false;

  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);

  // Maps for related data from dedicated entities
  donorPlaceMap = new Map<string, Place>();
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorBirthDateMap = new Map<string, Date>();

  // Filter stats
  totalDonors = 0;
  filteredByAnash = 0;
  filteredByAge = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CampaignDonorsModalComponent>,
    private donorService: DonorService
  ) {}

  async ngOnInit() {
    await this.loadCampaign();
    await this.loadInvitedDonors();
  }

  private async loadCampaign() {
    if (!this.args?.campaignId) {
      this.ui.error('לא נמצא מזהה קמפיין');
      this.closeModal();
      return;
    }

    this.loading = true;
    try {
      // Load campaign without cache to get latest data
      const foundCampaign = await this.campaignRepo.findId(this.args.campaignId);
      if (!foundCampaign) {
        throw new Error('קמפיין לא נמצא');
      }
      this.campaign = foundCampaign;

      if (!this.campaign) {
        throw new Error('קמפיין לא נמצא');
      }
    } catch (error: any) {
      console.error('Error loading campaign:', error);
      this.ui.error('שגיאה בטעינת הקמפיין: ' + (error.message || error));
      this.closeModal();
    } finally {
      this.loading = false;
    }
  }

  private async loadInvitedDonors() {
    if (!this.campaign) return;

    this.loading = true;
    try {
      // Build where clause for filtering
      let where: any = {};

      // 1. Filter by Anash
      if (this.campaign.invitedDonorFilters?.isAnash) {
        where.anash = true;
      }

      // Get initial results
      const baseDonors = await this.donorRepo.find({ where });
      this.totalDonors = baseDonors.length;

      // Use DonorService to load all related data
      const relatedData = await this.donorService.loadDonorRelatedData(
        baseDonors.map(d => d.id)
      );

      // Populate maps from service
      this.donorPlaceMap = relatedData.donorPlaceMap;
      this.donorEmailMap = relatedData.donorEmailMap;
      this.donorPhoneMap = relatedData.donorPhoneMap;
      this.donorBirthDateMap = relatedData.donorBirthDateMap;

      let donors = baseDonors;

      // 2. Filter by age range (client-side as it might require calculation)
      if (this.campaign.invitedDonorFilters?.minAge || this.campaign.invitedDonorFilters?.maxAge) {
        const now = new Date();
        donors = donors.filter((donor: Donor) => {
          const birthDate = this.donorBirthDateMap.get(donor.id);
          if (!birthDate) return true; // Include if no birth date

          const age = this.calculateAge(birthDate);

          if (this.campaign.invitedDonorFilters!.minAge && age < this.campaign.invitedDonorFilters.minAge) return false;
          if (this.campaign.invitedDonorFilters!.maxAge && age > this.campaign.invitedDonorFilters.maxAge) return false;

          return true;
        });
        this.filteredByAge = this.totalDonors - donors.length;
      }

      this.invitedDonors = donors;

      // Update stats
      this.updateFilterStats();

    } catch (error: any) {
      console.error('Error loading invited donors:', error);
      this.ui.error('שגיאה בטעינת רשימת המוזמנים: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  private extractCountry(location: string): string {
    // Simple extraction logic - can be enhanced
    const locationLower = location.toLowerCase();

    if (locationLower.includes('ישראל') || locationLower.includes('israel')) return 'ישראל';
    if (locationLower.includes('ארה"ב') || locationLower.includes('usa')) return 'ארה"ב';
    if (locationLower.includes('קנדה') || locationLower.includes('canada')) return 'קנדה';
    if (locationLower.includes('בריטניה') || locationLower.includes('uk')) return 'בריטניה';
    if (locationLower.includes('צרפת') || locationLower.includes('france')) return 'צרפת';

    // Try to extract the last part as country
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  private updateFilterStats() {
    // Update filtering statistics for display
    this.filteredByAnash = this.campaign.invitedDonorFilters?.isAnash ? this.invitedDonors.length : 0;
  }

  async exportToExcel() {
    // TODO: Implement Excel export
    this.snackBar.open('ייצוא לאקסל בפיתוח', 'סגור', { duration: 3000 });
  }

  async sendInvitations() {
    // TODO: Implement send invitations
    this.snackBar.open('שליחת הזמנות בפיתוח', 'סגור', { duration: 3000 });
  }

  openDonorDetails(donor: Donor) {
    this.ui.donorDetailsDialog(donor.id);
  }

  closeModal(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.dialogRef.close();
  }

  getDonorDisplayName(donor: Donor): string {
    return `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || donor.id || 'לא ידוע';
  }

  getDonorPhone(donor: Donor): string {
    return this.donorPhoneMap.get(donor.id) || '-';
  }

  getDonorEmail(donor: Donor): string {
    return this.donorEmailMap.get(donor.id) || '-';
  }

  getDonorLevel(donor: Donor): string {
    return donor.level || '-';
  }

  getDonorCity(donor: Donor): string {
    return this.donorPlaceMap.get(donor.id)?.city || '-';
  }
}