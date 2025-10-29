import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, Donor, Circle } from '../../../../shared/entity';
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
  allDonors: Donor[] = []; // All donors in system for filter lists
  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);
  circleRepo = remult.repo(Circle);
  loading = false;

  // Selection management
  selectedDonors: Set<string> = new Set();

  // Filter data
  circles: Circle[] = [];
  countries: string[] = [];
  cities: string[] = [];
  neighborhoods: string[] = [];

  // Active filters
  selectedCountry = '';
  selectedCity = '';
  selectedNeighborhood = '';
  selectedCircleId = '';
  selectedAlumniStatus = '';

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
    await this.loadCircles();
    await this.loadAllDonorsForFilters();
    this.extractFilterData();
    await this.loadInvitedDonors();
    // Load previously saved invited donors
    if (this.campaign?.invitedDonorIds) {
      this.selectedDonors = new Set(this.campaign.invitedDonorIds);
    }
  }

  async loadCircles() {
    try {
      this.circles = await this.circleRepo.find({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc', name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading circles:', error);
    }
  }

  async loadAllDonorsForFilters() {
    try {
      // Load all donors with their places and countries for filter lists
      this.allDonors = await this.donorRepo.find({
        include: {
          homePlace: {
            include: {
              country: true
            }
          }
        },
        orderBy: { firstName: 'asc', lastName: 'asc' }
      });
    } catch (error) {
      console.error('Error loading all donors for filters:', error);
    }
  }

  extractFilterData() {
    // Extract unique values from ALL donors (not just filtered ones)
    const countriesSet = new Set<string>();
    const citiesSet = new Set<string>();
    const neighborhoodsSet = new Set<string>();

    this.allDonors.forEach(donor => {
      if (donor.homePlace?.country?.name) {
        countriesSet.add(donor.homePlace.country.name);
      }
      if (donor.homePlace?.city) {
        citiesSet.add(donor.homePlace.city);
      }
      if (donor.homePlace?.neighborhood) {
        neighborhoodsSet.add(donor.homePlace.neighborhood);
      }
    });

    this.countries = Array.from(countriesSet).sort();
    this.cities = Array.from(citiesSet).sort();
    this.neighborhoods = Array.from(neighborhoodsSet).sort();
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
      // Build filter conditions
      const where: any = {};

      // Apply country filter
      if (this.selectedCountry) {
        where['homePlace.country.name'] = this.selectedCountry;
      }

      // Apply city filter
      if (this.selectedCity) {
        where['homePlace.city'] = this.selectedCity;
      }

      // Apply neighborhood filter
      if (this.selectedNeighborhood) {
        where['homePlace.neighborhood'] = this.selectedNeighborhood;
      }

      // Apply circle filter
      if (this.selectedCircleId) {
        where['circleIds'] = { $contains: this.selectedCircleId };
      }

      // Apply alumni filter
      if (this.selectedAlumniStatus === 'alumni') {
        where['isAlumni'] = true;
      } else if (this.selectedAlumniStatus === 'notAlumni') {
        where['isAlumni'] = false;
      }

      // Apply אנ"ש filter
      if (this.campaign.isAnash) {
        where['isAnash'] = true;
      } else if (this.campaign.excludeAnash) {
        where['isAnash'] = false;
      }

      // Apply age filters
      if (this.campaign.minAge || this.campaign.maxAge) {
        // Age filtering will need to be done client-side or with a backend method
        // For now, we'll load all matching donors and filter by age after
      }

      // Apply circle filter from campaign (old style)
      if (this.campaign.circle) {
        where['level'] = this.campaign.circle;
      }

      // Load donors with filters
      const allDonors = await this.donorRepo.find({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          homePlace: {
            include: {
              country: true
            }
          }
        }
      });

      // Apply age filtering client-side if needed
      if (this.campaign.minAge || this.campaign.maxAge) {
        this.invitedDonors = allDonors.filter(donor => {
          if (!donor.birthDate) return true; // Include if no birthDate
          const age = this.calculateAge(donor.birthDate);
          if (this.campaign.minAge && age < this.campaign.minAge) return false;
          if (this.campaign.maxAge && age > this.campaign.maxAge) return false;
          return true;
        });
      } else {
        this.invitedDonors = allDonors;
      }

      this.totalDonors = this.invitedDonors.length;

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
      this.campaign.minAge ||
      this.campaign.maxAge ||
      this.selectedCountry ||
      this.selectedCity ||
      this.selectedNeighborhood ||
      this.selectedCircleId ||
      this.selectedAlumniStatus
    );
  }

  markAsChanged() {
    // Reload donors when filters change
    this.loadInvitedDonors();
  }

  onFilterChange() {
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
