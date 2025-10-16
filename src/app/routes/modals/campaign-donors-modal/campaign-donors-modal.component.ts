import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Campaign, Donor } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface CampaignDonorsModalArgs {
  campaignId: string;
}

@Component({
  selector: 'app-campaign-donors-modal',
  templateUrl: './campaign-donors-modal.component.html',
  styleUrls: ['./campaign-donors-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    SharedComponentsModule
  ]
})
export class CampaignDonorsModalComponent implements OnInit {
  args!: CampaignDonorsModalArgs;
  shouldClose = false;

  campaign!: Campaign;
  invitedDonors: Donor[] = [];
  loading = false;

  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);

  // Filter stats
  totalDonors = 0;
  filteredByAnash = 0;
  filteredByLevels = 0;
  filteredByCountry = 0;
  filteredByAge = 0;
  filteredBySocialCircle = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
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
      if (this.campaign.isAnash) {
        where.anash = true;
      }

      // 2. Filter by levels
      if (this.campaign.invitationLevels && this.campaign.invitationLevels.length > 0) {
        where.level = { $in: this.campaign.invitationLevels };
      }

      // 3. Filter by same country
      if (this.campaign.sameCountryOnly && this.campaign.eventLocation) {
        // Extract country from event location
        const country = this.extractCountry(this.campaign.eventLocation?.fullAddress || '');
        if (country) {
          where.country = country;
        }
      }

      // Get initial results
      let donors = await this.donorRepo.find({ where });
      this.totalDonors = donors.length;

      // 4. Filter by age range (client-side as it might require calculation)
      if (this.campaign.minAge || this.campaign.maxAge) {
        const now = new Date();
        donors = donors.filter((donor: Donor) => {
          if (!donor.birthDate) return true; // Include if no birth date

          const age = this.calculateAge(donor.birthDate);

          if (this.campaign.minAge && age < this.campaign.minAge) return false;
          if (this.campaign.maxAge && age > this.campaign.maxAge) return false;

          return true;
        });
        this.filteredByAge = this.totalDonors - donors.length;
      }

      // 5. Filter by social circle
      if (this.campaign.socialCircle) {
        donors = donors.filter((donor: Donor) =>
          // Note: socialCircle field doesn't exist in Donor entity
          // This filter is skipped for now
          true
        );
        this.filteredBySocialCircle = this.totalDonors - donors.length;
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
    this.filteredByAnash = this.campaign.isAnash ? this.invitedDonors.length : 0;
    this.filteredByLevels = this.campaign.invitationLevels?.length ? this.invitedDonors.length : 0;
    this.filteredByCountry = this.campaign.sameCountryOnly ? this.invitedDonors.length : 0;
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

  closeModal(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.shouldClose = true;
    this.cdr.detectChanges();
  }

  getDonorDisplayName(donor: Donor): string {
    return `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || donor.id || 'לא ידוע';
  }

  getDonorPhone(donor: Donor): string {
    return donor.phone || '-';
  }

  getDonorEmail(donor: Donor): string {
    return donor.email || '-';
  }

  getDonorLevel(donor: Donor): string {
    return donor.level || '-';
  }
}