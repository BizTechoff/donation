import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, Donor } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { openDialog, DialogConfig } from 'common-ui-elements';

export interface CampaignInvitedListModalArgs {
  campaignId: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-invited-list-modal',
  templateUrl: './campaign-invited-list-modal.component.html',
  styleUrls: ['./campaign-invited-list-modal.component.scss']
})
export class CampaignInvitedListModalComponent implements OnInit {
  args!: CampaignInvitedListModalArgs;

  campaign!: Campaign;
  invitedDonors: Donor[] = [];
  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);
  loading = false;

  // Selection management
  selectedDonors: Set<string> = new Set();

  // Show all donors toggle (bypass filters)
  // showAllDonors = false;

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
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CampaignInvitedListModalComponent>
  ) {}

  async ngOnInit() {
    await this.loadCampaign();
    await this.loadInvitedDonors();
    // Load previously saved invited donors
    if (this.campaign?.invitedDonorIds) {
      this.selectedDonors = new Set(this.campaign.invitedDonorIds);
    }
  }

  async loadCampaign() {
    if (!this.args?.campaignId) {
      this.ui.error('לא נמצא מזהה קמפיין');
      this.closeModal();
      return;
    }

    this.loading = true;
    try {
      const foundCampaign = await this.campaignRepo.findId(this.args.campaignId, {
        include: {
          eventLocation: { include: { country: true } }
        }
      });
      if (foundCampaign) {
        this.campaign = foundCampaign;
      } else {
        throw new Error(`Campaign with ID ${this.args.campaignId} not found`);
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      this.ui.error('שגיאה בטעינת הקמפיין');
      this.closeModal();
    } finally {
      this.loading = false;
    }
  }

  async loadInvitedDonors() {
    if (!this.campaign) return;

    this.loading = true;
    try {
      // Load all donors in the system
      const allDonors = await this.donorRepo.find({});
      this.invitedDonors = allDonors;
      this.totalDonors = allDonors.length;

    } catch (error: any) {
      console.error('Error loading invited donors:', error);
      this.ui.error('שגיאה בטעינת רשימת המוזמנים: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
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
    this.dialogRef.close();
  }

  get canEdit(): boolean {
    return this.campaign?.status === 'draft' || this.campaign?.status === 'active';
  }

  get hasActiveFilters(): boolean {
    if (!this.campaign) return false;
    return !!(
      this.campaign.isAnash ||
      this.campaign.excludeAnash ||
      this.campaign.circle ||
      this.campaign.sameCountryOnly ||
      this.campaign.excludeSameCountry ||
      this.campaign.minAge ||
      this.campaign.maxAge
    );
  }

  markAsChanged() {
    // Reload donors when filters change
    this.loadInvitedDonors();
  }

  toggleCircle(circle: 'platinum' | 'gold' | 'silver' | 'regular') {
    if (!this.canEdit) return;

    // If clicking on the already selected circle, deselect it
    if (this.campaign.circle === circle) {
      this.campaign.circle = '';
    } else {
      this.campaign.circle = circle;
    }

    this.markAsChanged();
  }

  // Methods for אנ"ש include/exclude
  onAnashIncludeChange() {
    if (this.campaign.isAnash && this.campaign.excludeAnash) {
      this.campaign.excludeAnash = false;
    }
    this.markAsChanged();
  }

  onAnashExcludeChange() {
    if (this.campaign.excludeAnash && this.campaign.isAnash) {
      this.campaign.isAnash = false;
    }
    this.markAsChanged();
  }

  // Methods for same country include/exclude
  onSameCountryIncludeChange() {
    if (this.campaign.sameCountryOnly && this.campaign.excludeSameCountry) {
      this.campaign.excludeSameCountry = false;
    }
    this.markAsChanged();
  }

  onSameCountryExcludeChange() {
    if (this.campaign.excludeSameCountry && this.campaign.sameCountryOnly) {
      this.campaign.sameCountryOnly = false;
    }
    this.markAsChanged();
  }

  // Open activists related to campaign
  openActivists() {
    // TODO: Implement navigation to activists with campaign filter
    console.log('Opening activists for campaign:', this.campaign.id);
  }

  // Open contacts related to campaign
  openContacts() {
    // TODO: Implement navigation to contacts with campaign filter
    console.log('Opening contacts for campaign:', this.campaign.id);
  }

  async saveCampaign() {
    if (!this.campaign) return;

    try {
      this.loading = true;
      // Save selected donors to campaign
      this.campaign.invitedDonorIds = Array.from(this.selectedDonors);
      await remult.repo(Campaign).update(this.campaign.id, this.campaign);
      this.snackBar.open('הקמפיין נשמר בהצלחה', 'סגור', { duration: 3000 });
      await this.loadInvitedDonors();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      this.ui.error('שגיאה בשמירת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
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

  // Selection management methods
  isSelected(donorId: string): boolean {
    return this.selectedDonors.has(donorId);
  }

  toggleSelection(donorId: string) {
    if (this.selectedDonors.has(donorId)) {
      this.selectedDonors.delete(donorId);
    } else {
      this.selectedDonors.add(donorId);
    }
  }

  isAllSelected(): boolean {
    return this.invitedDonors.length > 0 && this.selectedDonors.size === this.invitedDonors.length;
  }

  toggleAllSelection() {
    if (this.isAllSelected()) {
      this.selectedDonors.clear();
    } else {
      this.invitedDonors.forEach(donor => this.selectedDonors.add(donor.id));
    }
  }

  selectAll() {
    this.invitedDonors.forEach(donor => this.selectedDonors.add(donor.id));
  }

  deselectAll() {
    this.selectedDonors.clear();
  }

  get selectedCount(): number {
    return this.selectedDonors.size;
  }
}
