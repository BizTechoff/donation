import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, Donor, Circle, Place } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { openDialog, DialogConfig, BusyService } from 'common-ui-elements';
import { ExcelExportService, ExcelColumn } from '../../../services/excel-export.service';
import { DonorService } from '../../../services/donor.service';
import { GlobalFilterService } from '../../../services/global-filter.service';
import { Subscription } from 'rxjs';

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
export class CampaignInvitedListModalComponent implements OnInit, OnDestroy {
  args!: CampaignInvitedListModalArgs;

  campaign!: Campaign;
  invitedDonors: Donor[] = [];
  allDonors: Donor[] = []; // All donors in system for filter lists
  campaignRepo = remult.repo(Campaign);
  donorRepo = remult.repo(Donor);
  circleRepo = remult.repo(Circle);
  loading = false;
  private subscription = new Subscription();

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
  freeSearchText = ''; // חיפוש חופשי

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;

  // Sorting
  sortField = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filter stats
  totalDonors = 0;
  filteredByAnash = 0;
  filteredByAge = 0;

  // Expose Math to template
  Math = Math;

  // Base data loaded flag
  private baseDataLoaded = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CampaignInvitedListModalComponent>,
    private excelService: ExcelExportService,
    private donorService: DonorService,
    private busy: BusyService,
    private globalFilterService: GlobalFilterService
  ) {}

  async ngOnInit() {
    // Subscribe to global filter changes
    this.subscription.add(
      this.globalFilterService.filters$.subscribe(() => {
        console.log('CampaignInvitedList: Global filters changed, reloading data');
        this.loadInvitedDonors();
      })
    );

    await this.refreshData();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * ✅ Main data loading method - wrapped with BusyService
   * Calls loadBaseData if not loaded yet, then loads other data
   */
  async refreshData() {
    await this.busy.doWhileShowingBusy(async () => {
      // Step 1: Load campaign (always first)
      await this.loadCampaign();
      if (!this.campaign) return;

      // Step 2: Load base data if not loaded yet
      if (!this.baseDataLoaded) {
        await this.loadBaseData();
        this.baseDataLoaded = true;
      }

      // Step 3: Load dynamic data
      await this.loadDynamicData();

      // Step 4: Apply saved selections
      if (this.campaign?.invitedDonorIds && this.campaign.invitedDonorIds.length > 0) {
        this.selectedDonors = new Set(this.campaign.invitedDonorIds);
      }
    });
  }

  /**
   * Load base data - called once (circles, donors with related data)
   */
  private async loadBaseData() {
    // Load in parallel
    await Promise.all([
      this.loadCircles(),
      this.loadInvitedDonors()
    ]);

    // Set allDonors from invitedDonors
    this.allDonors = this.invitedDonors;

    // Extract filter data from loaded donors
    this.extractFilterData();
  }

  /**
   * Load dynamic data - can be called multiple times
   */
  private async loadDynamicData() {
    // Load previously saved filters
    this.loadFiltersFromCampaign();

    // Apply filters as selection
    this.applyFiltersAsSelection();
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

  // ✅ REMOVED: loadAllDonorsForFilters - מיותר, allDonors מגיע מ-invitedDonors

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
    }
  }

  async loadInvitedDonors() {
    if (!this.campaign) return;

    try {
      // Use global filters to get filtered donors
      const filteredDonors = await this.donorService.findFiltered();
      console.log('CampaignInvitedList: Loaded donors from global filters:', filteredDonors.length);

      // Load related data for filtered donors
      const relatedData = await this.donorService.loadDonorRelatedData(
        filteredDonors.map(d => d.id)
      );

      // Populate maps from service
      this.donorPlaceMap = relatedData.donorPlaceMap;
      this.donorEmailMap = relatedData.donorEmailMap;
      this.donorPhoneMap = relatedData.donorPhoneMap;
      this.donorBirthDateMap = relatedData.donorBirthDateMap;

      this.invitedDonors = filteredDonors;
      this.totalDonors = this.invitedDonors.length;

      // Apply current filters as selection
      this.applyFiltersAsSelection();

    } catch (error: any) {
      console.error('Error loading invited donors:', error);
      this.ui.error('שגיאה בטעינת רשימת המוזמנים: ' + (error.message || error));
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
      { header: 'תלמידנו', mapper: (d) => this.excelService.booleanToHebrew(d.isAlumni), width: 8 },
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

    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Save selected donors to campaign
        this.campaign.invitedDonorIds = Array.from(this.selectedDonors);
        // Save current filters to campaign
        this.campaign.invitedDonorFilters = this.getCurrentFilters();
        await remult.repo(Campaign).update(this.campaign.id, this.campaign);
        this.snackBar.open('הקמפיין נשמר בהצלחה', 'סגור', { duration: 3000 });
        // Refresh data after save
        await this.refreshData();
      } catch (error: any) {
        console.error('Error saving campaign:', error);
        this.ui.error('שגיאה בשמירת הקמפיין: ' + (error.message || error));
      }
    });
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

    // Filter 1: Free text search across all visible columns
    if (this.freeSearchText && this.freeSearchText.trim()) {
      const searchLower = this.freeSearchText.trim().toLowerCase();
      result = result.filter(donor => {
        const name = this.getDonorDisplayName(donor).toLowerCase();
        const phone = this.getDonorPhone(donor).toLowerCase();
        const email = this.getDonorEmail(donor).toLowerCase();
        const level = this.getDonorLevel(donor).toLowerCase();
        const city = this.getDonorCity(donor).toLowerCase();
        const neighborhood = this.getDonorNeighborhood(donor).toLowerCase();
        const country = this.getDonorCountryName(donor).toLowerCase();

        return name.includes(searchLower) ||
               phone.includes(searchLower) ||
               email.includes(searchLower) ||
               level.includes(searchLower) ||
               city.includes(searchLower) ||
               neighborhood.includes(searchLower) ||
               country.includes(searchLower);
      });
    }

    // Filter 2: Show only selected
    if (this.showOnlySelected) {
      result = result.filter(donor => this.selectedDonors.has(donor.id));
    }

    // Calculate total pages based on filtered results
    this.totalPages = Math.ceil(result.length / this.pageSize);

    // Sort: selected first (if enabled), then by sort field
    result.sort((a, b) => {
      // First: selected first (if enabled)
      if (this.showSelectedFirst) {
        const aSelected = this.selectedDonors.has(a.id);
        const bSelected = this.selectedDonors.has(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
      }

      // Second: by sort field
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'firstName':
          aValue = a.firstName?.toLowerCase() || '';
          bValue = b.firstName?.toLowerCase() || '';
          break;
        case 'lastName':
          aValue = a.lastName?.toLowerCase() || '';
          bValue = b.lastName?.toLowerCase() || '';
          break;
        case 'phone':
          aValue = this.getDonorPhone(a).toLowerCase();
          bValue = this.getDonorPhone(b).toLowerCase();
          break;
        case 'email':
          aValue = this.getDonorEmail(a).toLowerCase();
          bValue = this.getDonorEmail(b).toLowerCase();
          break;
        case 'level':
          aValue = this.getDonorLevel(a).toLowerCase();
          bValue = this.getDonorLevel(b).toLowerCase();
          break;
        case 'city':
          aValue = this.getDonorCity(a).toLowerCase();
          bValue = this.getDonorCity(b).toLowerCase();
          break;
        default:
          aValue = a.firstName?.toLowerCase() || '';
          bValue = b.firstName?.toLowerCase() || '';
      }

      const comparison = aValue.localeCompare(bValue, 'he');
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Apply pagination - return only current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return result.slice(startIndex, endIndex);
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Auto-select donors on this page if they're in selectedDonors
      this.autoSelectDisplayedDonors();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.autoSelectDisplayedDonors();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.autoSelectDisplayedDonors();
    }
  }

  firstPage() {
    this.currentPage = 1;
    this.autoSelectDisplayedDonors();
  }

  lastPage() {
    this.currentPage = this.totalPages;
    this.autoSelectDisplayedDonors();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Auto-select displayed donors if they're in selectedDonors (master list)
  private autoSelectDisplayedDonors() {
    // This is automatic - displayedDonors already checks isSelected()
    // which checks against this.selectedDonors Set
    // No action needed - the UI will reflect the selection state
  }

  // Sorting methods
  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1; // Reset to first page after sorting
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Free search change handler
  onFreeSearchChange() {
    this.currentPage = 1; // Reset to first page on search
  }

  get totalFilteredCount(): number {
    let result = [...this.invitedDonors];

    // Apply free text search
    if (this.freeSearchText && this.freeSearchText.trim()) {
      const searchLower = this.freeSearchText.trim().toLowerCase();
      result = result.filter(donor => {
        const name = this.getDonorDisplayName(donor).toLowerCase();
        const phone = this.getDonorPhone(donor).toLowerCase();
        const email = this.getDonorEmail(donor).toLowerCase();
        const level = this.getDonorLevel(donor).toLowerCase();
        const city = this.getDonorCity(donor).toLowerCase();

        return name.includes(searchLower) ||
               phone.includes(searchLower) ||
               email.includes(searchLower) ||
               level.includes(searchLower) ||
               city.includes(searchLower);
      });
    }

    // Apply show only selected
    if (this.showOnlySelected) {
      result = result.filter(donor => this.selectedDonors.has(donor.id));
    }

    return result.length;
  }
}
