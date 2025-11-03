import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, Donor, Circle, Place } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { openDialog, DialogConfig } from 'common-ui-elements';
import { ExcelExportService, ExcelColumn } from '../../../services/excel-export.service';
import { DonorService } from '../../../services/donor.service';

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

  // Maps for related data from dedicated entities
  donorPlaceMap = new Map<string, Place>();
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorBirthDateMap = new Map<string, Date>();

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

  // Alumni filters (like Anash)
  includeAlumni = false;
  excludeAlumni = false;

  // Display options
  showOnlySelected = false;
  showSelectedFirst = false;

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
    public dialogRef: MatDialogRef<CampaignInvitedListModalComponent>,
    private excelService: ExcelExportService,
    private donorService: DonorService
  ) {}

  async ngOnInit() {
    await this.loadCampaign();
    await this.loadCircles();
    await this.loadAllDonorsForFilters();
    this.extractFilterData();
    // Load previously saved filters
    this.loadFiltersFromCampaign();
    await this.loadInvitedDonors();
    // Load previously saved invited donors - only if not empty
    // Otherwise keep the selection from filters (applyFiltersAsSelection)
    if (this.campaign?.invitedDonorIds && this.campaign.invitedDonorIds.length > 0) {
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
      // Load all donors
      const baseAllDonors = await this.donorRepo.find({
        orderBy: { firstName: 'asc', lastName: 'asc' }
      });

      // Use DonorService to load all related data
      const relatedData = await this.donorService.loadDonorRelatedData(
        baseAllDonors.map(d => d.id)
      );

      // Populate maps from service
      this.donorPlaceMap = relatedData.donorPlaceMap;
      this.donorEmailMap = relatedData.donorEmailMap;
      this.donorPhoneMap = relatedData.donorPhoneMap;
      this.donorBirthDateMap = relatedData.donorBirthDateMap;

      this.allDonors = baseAllDonors;
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
      const place = this.donorPlaceMap.get(donor.id);
      if (place?.country?.name) {
        countriesSet.add(place.country.name);
      }
      if (place?.city) {
        citiesSet.add(place.city);
      }
      if (place?.neighborhood) {
        neighborhoodsSet.add(place.neighborhood);
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
      // Load ALL donors without filtering - filters will only affect selection
      const baseAllDonors = await this.donorRepo.find({});

      // Use DonorService to load all related data
      const relatedData = await this.donorService.loadDonorRelatedData(
        baseAllDonors.map(d => d.id)
      );

      // Populate maps from service
      this.donorPlaceMap = relatedData.donorPlaceMap;
      this.donorEmailMap = relatedData.donorEmailMap;
      this.donorPhoneMap = relatedData.donorPhoneMap;
      this.donorBirthDateMap = relatedData.donorBirthDateMap;

      this.invitedDonors = baseAllDonors;
      this.totalDonors = this.invitedDonors.length;

      // Apply current filters as selection
      this.applyFiltersAsSelection();

    } catch (error: any) {
      console.error('Error loading invited donors:', error);
      this.ui.error('שגיאה בטעינת רשימת המוזמנים: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  // Apply current filters by selecting/deselecting matching donors
  // Two-stage process: 1) Inclusive filters select, 2) Exclusive filters deselect
  private applyFiltersAsSelection() {

    console.log('applyFiltersAsSelection')

    if (!this.campaign) return;

    // Only apply if there are active filters
    if (!this.hasActiveFilters) return;

    // שלב א': טיפול בפילטרי "כולל" - נקה ובחר מחדש
    if (this.hasInclusiveFilters) {
    console.log('applyFiltersAsSelection 1')

      this.selectedDonors.clear();
      this.invitedDonors.forEach(donor => {
        if (this.matchesInclusiveFilters(donor)) {
          this.selectedDonors.add(donor.id);
    console.log(' this.selectedDonors.size', this.selectedDonors.size)
        }
      });
    }

    // שלב ב': טיפול בפילטרי "לא כולל" - הסר סימון בלבד
    if (this.hasExclusiveFilters) {
    console.log('applyFiltersAsSelection 2')
      this.invitedDonors.forEach(donor => {
        if (this.shouldBeExcluded(donor)) {
          this.selectedDonors.delete(donor.id);
        }
      });
    }
  }

  // Check if there are any inclusive filters active
  private get hasInclusiveFilters(): boolean {
    if (!this.campaign) return false;
    return !!(
      this.campaign.invitedDonorFilters?.isAnash ||
      this.includeAlumni ||
      this.selectedCountry ||
      this.selectedCity ||
      this.selectedNeighborhood ||
      this.selectedCircleId ||
      this.campaign.invitedDonorFilters?.circle ||
      this.campaign.invitedDonorFilters?.minAge ||
      this.campaign.invitedDonorFilters?.maxAge
    );
  }

  // Check if there are any exclusive filters active
  private get hasExclusiveFilters(): boolean {
    if (!this.campaign) return false;
    return !!(
      this.campaign.invitedDonorFilters?.excludeAnash ||
      this.excludeAlumni
    );
  }

  // Check if donor matches inclusive filter criteria
  private matchesInclusiveFilters(donor: Donor): boolean {
    // Get related data from maps
    const place = this.donorPlaceMap.get(donor.id);
    const birthDate = this.donorBirthDateMap.get(donor.id);

    // Apply country filter
    if (this.selectedCountry) {
    console.log('selectedCountry')
      if (place?.country?.name !== this.selectedCountry) {
        return false;
      }
    }

    // Apply city filter
    if (this.selectedCity) {
    console.log('selecselectedCitytedCountry')
      if (place?.city !== this.selectedCity) {
        return false;
      }
    }

    // Apply neighborhood filter
    if (this.selectedNeighborhood) {
    console.log('selectedNeighborhood')
      if (place?.neighborhood !== this.selectedNeighborhood) {
        return false;
      }
    }

    // Apply circle filter
    if (this.selectedCircleId) {
      console.log('this.selectedCircleId',this.selectedCircleId)
      if (!donor.circleIds?.includes(this.selectedCircleId)) {
        return false;
      }
    }

    // Apply alumni inclusive filter
    if (this.includeAlumni) {
    console.log('includeAlumni')
      if (!donor.isAlumni) return false;
    }

    // Apply אנ"ש inclusive filter
    if (this.campaign.invitedDonorFilters?.isAnash) {
    console.log('isAnash',donor.isAnash,donor.firstName)
      if (!donor.isAnash) return false;
    console.log('isAnash 2',donor.isAnash,donor.firstName)
    }

    // Apply age filters
    if (this.campaign.invitedDonorFilters?.minAge || this.campaign.invitedDonorFilters?.maxAge) {
    console.log('minAge')
      if (birthDate) {
        const age = this.calculateAge(birthDate);
        if (this.campaign.invitedDonorFilters.minAge && age < this.campaign.invitedDonorFilters.minAge) return false;
        if (this.campaign.invitedDonorFilters.maxAge && age > this.campaign.invitedDonorFilters.maxAge) return false;
      }
    }

    // Apply circle filter from campaign
    if (this.campaign.invitedDonorFilters?.circle) {
    console.log('circle',this.campaign.invitedDonorFilters.circle,donor.circleIds?.length)
      if (donor.level !== this.campaign.invitedDonorFilters.circle) {
        return false;
      }
    }

    return true;
  }

  // Check if donor should be excluded (exclusive filters)
  private shouldBeExcluded(donor: Donor): boolean {
    // Exclude alumni
    if (this.excludeAlumni && donor.isAlumni) {
      return true;
    }

    // Exclude אנ"ש
    if (this.campaign.invitedDonorFilters?.excludeAnash && donor.isAnash) {
      return true;
    }

    return false;
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
    this.filteredByCountry = this.campaign.invitedDonorFilters?.sameCountryOnly ? this.invitedDonors.length : 0;
  }

  async exportToExcel() {
    if (!this.campaign) return;

    // בדיקה אם לייצא רק מסומנים או את כולם
    let donorsToExport = this.displayedDonors;

    if (this.selectedCount > 0 && this.selectedCount < this.displayedDonors.length) {
      const exportSelected = await this.ui.yesNoQuestion(
        `יש ${this.selectedCount} תורמים מסומנים מתוך ${this.displayedDonors.length}. האם לייצא רק את המסומנים?`
      );
      if (exportSelected) {
        donorsToExport = this.displayedDonors.filter(d => this.isSelected(d.id));
      }
    }

    // הגדרת עמודות
    const columns: ExcelColumn<Donor>[] = [
      { header: 'שם מלא', mapper: (d) => this.getDonorDisplayName(d), width: 20 },
      { header: 'טלפון', mapper: (d) => this.getDonorPhone(d), width: 15 },
      { header: 'אימייל', mapper: (d) => this.getDonorEmail(d), width: 25 },
      { header: 'רמה', mapper: (d) => this.getDonorLevel(d), width: 12 },
      { header: 'עיר', mapper: (d) => this.getDonorCity(d), width: 15 },
      { header: 'שכונה', mapper: (d) => this.getDonorNeighborhood(d), width: 15 },
      { header: 'מדינה', mapper: (d) => this.getDonorCountryName(d), width: 15 },
      { header: 'אנ"ש', mapper: (d) => this.excelService.booleanToHebrew(d.isAnash), width: 8 },
      { header: 'בוגר', mapper: (d) => this.excelService.booleanToHebrew(d.isAlumni), width: 8 },
      { header: 'מסומן', mapper: (d) => this.isSelected(d.id) ? '✓' : '', width: 8 }
    ];

    // ייצוא
    await this.excelService.export({
      data: donorsToExport,
      columns: columns,
      sheetName: 'מוזמנים',
      fileName: this.excelService.generateFileName(`מוזמנים_${this.campaign.name}`),
      includeStats: true,
      stats: [
        { label: 'שם קמפיין', value: this.campaign.name },
        { label: 'סה"כ מוזמנים מוצגים', value: this.displayedDonors.length },
        { label: 'מוזמנים מיוצאים', value: donorsToExport.length },
        { label: 'מסומנים', value: this.selectedCount },
        { label: 'תאריך ייצוא', value: new Date().toLocaleDateString('he-IL') }
      ]
    });
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

  get canEdit(): boolean {
    return this.campaign?.isActive === true;
  }

  get hasActiveFilters(): boolean {
    if (!this.campaign) return false;
    return !!(
      this.campaign.invitedDonorFilters?.isAnash ||
      this.campaign.invitedDonorFilters?.excludeAnash ||
      this.campaign.invitedDonorFilters?.circle ||
      this.campaign.invitedDonorFilters?.minAge ||
      this.campaign.invitedDonorFilters?.maxAge ||
      this.selectedCountry ||
      this.selectedCity ||
      this.selectedNeighborhood ||
      this.selectedCircleId ||
      this.includeAlumni ||
      this.excludeAlumni
    );
  }

  markAsChanged() {
    // Apply filters as selection (don't reload - just update selection)
    this.applyFiltersAsSelection();
  }

  onFilterChange() {
    // Apply filters as selection (don't reload - just update selection)
    this.applyFiltersAsSelection();
  }

  toggleCircle(circle: 'platinum' | 'gold' | 'silver' | 'regular') {
    if (!this.canEdit) return;

    if (!this.campaign.invitedDonorFilters) {
      this.campaign.invitedDonorFilters = {};
    }

    // If clicking on the already selected circle, deselect it
    if (this.campaign.invitedDonorFilters.circle === circle) {
      this.campaign.invitedDonorFilters.circle = '';
    } else {
      this.campaign.invitedDonorFilters.circle = circle;
    }

    this.markAsChanged();
  }

  // Methods for אנ"ש include/exclude
  onAnashIncludeChange() {
    if (!this.campaign.invitedDonorFilters) {
      this.campaign.invitedDonorFilters = {};
    }

    if (this.campaign.invitedDonorFilters.isAnash && this.campaign.invitedDonorFilters.excludeAnash) {
      this.campaign.invitedDonorFilters.excludeAnash = false;
    }
    this.markAsChanged();
  }

  onAnashExcludeChange() {
    if (!this.campaign.invitedDonorFilters) {
      this.campaign.invitedDonorFilters = {};
    }

    if (this.campaign.invitedDonorFilters.excludeAnash && this.campaign.invitedDonorFilters.isAnash) {
      this.campaign.invitedDonorFilters.isAnash = false;
    }
    this.markAsChanged();
  }

  // Methods for Alumni include/exclude (like Anash)
  onAlumniIncludeChange() {
    if (this.includeAlumni && this.excludeAlumni) {
      this.excludeAlumni = false;
    }
    this.markAsChanged();
  }

  onAlumniExcludeChange() {
    if (this.excludeAlumni && this.includeAlumni) {
      this.includeAlumni = false;
    }
    this.markAsChanged();
  }

  // Clear all filters
  clearFilters() {
    // Clear campaign filters
    if (this.campaign) {
      if (!this.campaign.invitedDonorFilters) {
        this.campaign.invitedDonorFilters = {};
      }
      this.campaign.invitedDonorFilters.isAnash = false;
      this.campaign.invitedDonorFilters.excludeAnash = false;
      this.campaign.invitedDonorFilters.circle = '';
      this.campaign.invitedDonorFilters.minAge = undefined;
      this.campaign.invitedDonorFilters.maxAge = undefined;
    }

    // Clear local filters
    this.selectedCountry = '';
    this.selectedCity = '';
    this.selectedNeighborhood = '';
    this.selectedCircleId = '';
    this.includeAlumni = false;
    this.excludeAlumni = false;
    this.showOnlySelected = false;
    this.showSelectedFirst = false;

    // Reapply (which will clear selection since no filters)
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
      // Save current filters to campaign
      this.campaign.invitedDonorFilters = this.getCurrentFilters();
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

  getDonorNeighborhood(donor: Donor): string {
    return this.donorPlaceMap.get(donor.id)?.neighborhood || '-';
  }

  getDonorCountryName(donor: Donor): string {
    return this.donorPlaceMap.get(donor.id)?.country?.name || '-';
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

  // Load filters from campaign
  private loadFiltersFromCampaign() {
    if (!this.campaign) return;

    if (!this.campaign.invitedDonorFilters) {
      this.campaign.invitedDonorFilters = {};
    }

    const filters = this.campaign.invitedDonorFilters;

    // Load local filters that are not part of campaign entity
    if (filters.selectedCountry !== undefined) this.selectedCountry = filters.selectedCountry;
    if (filters.selectedCity !== undefined) this.selectedCity = filters.selectedCity;
    if (filters.selectedNeighborhood !== undefined) this.selectedNeighborhood = filters.selectedNeighborhood;
    if (filters.selectedCircleId !== undefined) this.selectedCircleId = filters.selectedCircleId;
    if (filters.includeAlumni !== undefined) this.includeAlumni = filters.includeAlumni;
    if (filters.excludeAlumni !== undefined) this.excludeAlumni = filters.excludeAlumni;
    if (filters.showOnlySelected !== undefined) this.showOnlySelected = filters.showOnlySelected;
    if (filters.showSelectedFirst !== undefined) this.showSelectedFirst = filters.showSelectedFirst;
  }

  // Save current filters to object
  private getCurrentFilters() {
    return {
      selectedCountry: this.selectedCountry || undefined,
      selectedCity: this.selectedCity || undefined,
      selectedNeighborhood: this.selectedNeighborhood || undefined,
      selectedCircleId: this.selectedCircleId || undefined,
      includeAlumni: this.includeAlumni || undefined,
      excludeAlumni: this.excludeAlumni || undefined,
      showOnlySelected: this.showOnlySelected || undefined,
      showSelectedFirst: this.showSelectedFirst || undefined,
    };
  }

  // Get filtered and sorted donors list based on display options
  get displayedDonors(): Donor[] {
    let result = [...this.invitedDonors];

    // Filter: show only selected
    if (this.showOnlySelected) {
      result = result.filter(donor => this.selectedDonors.has(donor.id));
    }

    // Sort: selected first, then alphabetically
    if (this.showSelectedFirst) {
      result.sort((a, b) => {
        const aSelected = this.selectedDonors.has(a.id);
        const bSelected = this.selectedDonors.has(b.id);

        // First by selection status
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        // Then alphabetically by first name, then last name
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName, 'he');
      });
    } else {
      // Just alphabetically
      result.sort((a, b) => {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName, 'he');
      });
    }

    return result;
  }
}
