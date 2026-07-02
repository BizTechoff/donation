import { Component, ElementRef, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campaign, Circle } from '../../../../shared/entity';
import { User } from '../../../../shared/entity/user';
import { ContactPerson } from '../../../../shared/entity/contact-person';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { openDialog, DialogConfig, BusyService } from 'common-ui-elements';
import { ExcelExportService, ExcelColumn } from '../../../services/excel-export.service';
import {
  DonorController,
  DonorSelectionFilters,
  InvitedDonorRow,
} from '../../../../shared/controllers/donor.controller';

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
  invitedDonors: InvitedDonorRow[] = [];
  campaignRepo = remult.repo(Campaign);
  circleRepo = remult.repo(Circle);
  loading = false;
  serverTotalCount = 0;

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

  // Alumni filters
  includeAlumni = false;
  excludeAlumni = false;

  // Display options
  showOnlySelected = false;
  showSelectedFirst = false;
  freeSearchText = '';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;

  // Scrollable rows handle - in this table the <tbody> itself scrolls
  // (display: block + overflow-y). Reset to top on each page load so paging
  // does not leave the user mid-page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;

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
    private busy: BusyService
  ) {}

  async ngOnInit() {
    await this.refreshData();
  }

  async refreshData() {
    await this.busy.doWhileShowingBusy(async () => {
      await this.loadCampaign();
      if (!this.campaign) return;

      if (!this.baseDataLoaded) {
        await this.loadBaseData();
        this.baseDataLoaded = true;
      }

      await this.loadDynamicData();

      if (this.campaign?.invitedDonorIds && this.campaign.invitedDonorIds.length > 0) {
        this.selectedDonors = new Set(this.campaign.invitedDonorIds);
      }
    });
  }

  private async loadBaseData() {
    await Promise.all([
      this.loadCircles(),
      this.loadPage()
    ]);
  }

  private async loadDynamicData() {
    this.loadFiltersFromCampaign();
    await this.applyFiltersAsSelection();
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

  async loadPage() {
    this.loading = true;
    try {
      const showOnlyIds = this.showOnlySelected ? Array.from(this.selectedDonors) : undefined;
      const serverSortField = ['firstName', 'lastName'].includes(this.sortField) ? this.sortField : 'firstName';
      const serverSortDir = ['firstName', 'lastName'].includes(this.sortField) ? this.sortDirection : 'asc';

      const result = await DonorController.getInvitedDonorsPage({
        page: this.currentPage,
        pageSize: this.pageSize,
        showOnlyIds,
        freeSearch: this.freeSearchText || undefined,
        sortField: serverSortField,
        sortDirection: serverSortDir
      });

      this.serverTotalCount = result.totalCount;
      this.totalDonors = result.totalCount;
      this.totalPages = Math.ceil(result.totalCount / this.pageSize);

      if (result.filterOptions.countries.length > 0 || result.filterOptions.cities.length > 0 || result.filterOptions.neighborhoods.length > 0) {
        this.countries = result.filterOptions.countries;
        this.cities = result.filterOptions.cities;
        this.neighborhoods = result.filterOptions.neighborhoods;
      }

      let rows = result.rows;

      if (['phone', 'email', 'city'].includes(this.sortField)) {
        rows = this.sortRowsByField(rows, this.sortField, this.sortDirection);
      }

      if (this.showSelectedFirst) {
        rows = this.sortRowsBySelection(rows);
      }

      this.invitedDonors = rows;

      // Reset rows scroll to top after each load (Israel Glikson, 1.7.2026) -
      // paging + filter changes should land at the top of the new page.
      if (this.scrollableTable?.nativeElement) {
        this.scrollableTable.nativeElement.scrollTop = 0;
      }
    } catch (error: any) {
      console.error('Error loading page:', error);
      this.ui.error('שגיאה בטעינת הרשימה: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  private sortRowsByField(rows: InvitedDonorRow[], field: string, direction: 'asc' | 'desc'): InvitedDonorRow[] {
    return [...rows].sort((a, b) => {
      let aVal: string, bVal: string;
      switch (field) {
        case 'phone': aVal = a.phone; bVal = b.phone; break;
        case 'email': aVal = a.email; bVal = b.email; break;
        case 'city': aVal = a.city; bVal = b.city; break;
        default: aVal = a.firstName; bVal = b.firstName;
      }
      const cmp = aVal.localeCompare(bVal, 'he');
      return direction === 'asc' ? cmp : -cmp;
    });
  }

  private sortRowsBySelection(rows: InvitedDonorRow[]): InvitedDonorRow[] {
    return [...rows].sort((a, b) => {
      const aS = this.selectedDonors.has(a.id) ? 0 : 1;
      const bS = this.selectedDonors.has(b.id) ? 0 : 1;
      return aS - bS;
    });
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

  private async applyFiltersAsSelection() {
    if (!this.campaign) return;
    if (!this.hasActiveFilters) return;

    const filters: DonorSelectionFilters = {
      isAnash: this.campaign.invitedDonorFilters?.isAnash || undefined,
      excludeAnash: this.campaign.invitedDonorFilters?.excludeAnash || undefined,
      isAlumni: this.includeAlumni || undefined,
      excludeAlumni: this.excludeAlumni || undefined,
      country: this.selectedCountry || undefined,
      city: this.selectedCity || undefined,
      neighborhood: this.selectedNeighborhood || undefined,
      circleId: this.selectedCircleId || undefined,
      minAge: this.campaign.invitedDonorFilters?.minAge,
      maxAge: this.campaign.invitedDonorFilters?.maxAge,
    };

    const { inclusiveIds, exclusiveIds } = await DonorController.getMatchingDonorIds(filters);

    if (this.hasInclusiveFilters) {
      this.selectedDonors = new Set(inclusiveIds);
    }
    if (this.hasExclusiveFilters) {
      exclusiveIds.forEach(id => this.selectedDonors.delete(id));
    }
  }

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

  private get hasExclusiveFilters(): boolean {
    if (!this.campaign) return false;
    return !!(
      this.campaign.invitedDonorFilters?.excludeAnash ||
      this.excludeAlumni
    );
  }

  async exportToExcel() {
    if (!this.campaign) return;

    let showOnlyIds: string[] | undefined;

    if (this.selectedCount > 0) {
      const exportSelected = await this.ui.yesNoQuestion(
        `יש ${this.selectedCount} תורמים מסומנים. האם לייצא רק את המסומנים?`
      );
      if (exportSelected) {
        showOnlyIds = Array.from(this.selectedDonors);
      }
    }

    const [exportResult, fundraisers, contactPersons] = await Promise.all([
      DonorController.getInvitedDonorsPage({
        page: 1,
        pageSize: 99999,
        showOnlyIds,
        freeSearch: this.freeSearchText || undefined,
      }),
      remult.repo(User).find({ where: { donator: true } }),
      remult.repo(ContactPerson).find()
    ]);

    const donorsToExport = exportResult.rows;
    const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
    const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

    const columns: ExcelColumn<InvitedDonorRow>[] = [
      { header: 'שם מלא', mapper: (d) => this.getDonorDisplayName(d), width: 20 },
      { header: 'טלפון', mapper: (d) => this.getDonorPhone(d), width: 15 },
      { header: 'אימייל', mapper: (d) => this.getDonorEmail(d), width: 25 },
      { header: 'רמה', mapper: (d) => this.getDonorLevel(d), width: 12 },
      { header: 'עיר', mapper: (d) => this.getDonorCity(d), width: 15 },
      { header: 'שכונה', mapper: (d) => this.getDonorNeighborhood(d), width: 15 },
      { header: 'מדינה', mapper: (d) => this.getDonorCountryName(d), width: 15 },
      { header: 'אנ"ש', mapper: (d) => this.excelService.booleanToHebrew(d.isAnash), width: 8 },
      { header: 'תלמידנו', mapper: (d) => this.excelService.booleanToHebrew(d.isAlumni), width: 8 },
      { header: 'מתרים', mapper: (d) => d.fundraiserId ? fundraiserMap.get(d.fundraiserId) || '' : '', width: 15 },
      { header: 'איש קשר', mapper: (d) => d.contactPersonId ? contactPersonMap.get(d.contactPersonId) || '' : '', width: 15 },
      { header: 'מסומן', mapper: (d) => this.isSelected(d.id) ? '✓' : '', width: 8 }
    ];

    await this.excelService.export({
      data: donorsToExport,
      columns,
      sheetName: 'מוזמנים',
      fileName: this.excelService.generateFileName(`מוזמנים_${this.campaign.name}`),
      includeStats: true,
      stats: [
        { label: 'שם קמפיין', value: this.campaign.name },
        { label: 'סה"כ מוזמנים', value: this.serverTotalCount },
        { label: 'מוזמנים מיוצאים', value: donorsToExport.length },
        { label: 'מסומנים', value: this.selectedCount },
        { label: 'תאריך ייצוא', value: new Date().toLocaleDateString('he-IL') }
      ]
    });
  }

  async sendInvitations() {
    this.snackBar.open('שליחת הזמנות בפיתוח', 'סגור', { duration: 3000 });
  }

  openDonorDetails(row: InvitedDonorRow) {
    this.ui.donorDetailsDialog(row.id);
  }

  closeModal(event?: MouseEvent) {
    if (event) event.stopPropagation();
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

  async markAsChanged() {
    await this.applyFiltersAsSelection();
  }

  async onFilterChange() {
    await this.applyFiltersAsSelection();
  }

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

  clearFilters() {
    if (this.campaign) {
      if (!this.campaign.invitedDonorFilters) {
        this.campaign.invitedDonorFilters = {};
      }
      this.campaign.invitedDonorFilters.isAnash = false;
      this.campaign.invitedDonorFilters.excludeAnash = false;
      this.campaign.invitedDonorFilters.minAge = undefined;
      this.campaign.invitedDonorFilters.maxAge = undefined;
    }

    this.selectedCountry = '';
    this.selectedCity = '';
    this.selectedNeighborhood = '';
    this.selectedCircleId = '';
    this.includeAlumni = false;
    this.excludeAlumni = false;
    this.showOnlySelected = false;
    this.showSelectedFirst = false;

    this.markAsChanged();
  }

  openActivists() {
    console.log('Opening activists for campaign:', this.campaign.id);
  }

  openContacts() {
    console.log('Opening contacts for campaign:', this.campaign.id);
  }

  async saveCampaign() {
    if (!this.campaign) return;

    await this.busy.doWhileShowingBusy(async () => {
      try {
        this.campaign.invitedDonorIds = Array.from(this.selectedDonors);
        this.campaign.invitedDonorFilters = this.getCurrentFilters();
        await remult.repo(Campaign).update(this.campaign.id, this.campaign);
        this.snackBar.open('הקמפיין נשמר בהצלחה', 'סגור', { duration: 3000 });
        await this.refreshData();
      } catch (error: any) {
        console.error('Error saving campaign:', error);
        this.ui.error('שגיאה בשמירת הקמפיין: ' + (error.message || error));
      }
    });
  }

  getDonorDisplayName(row: InvitedDonorRow): string {
    return `${row.firstName} ${row.lastName}`.trim() || row.id || 'לא ידוע';
  }

  getDonorPhone(row: InvitedDonorRow): string {
    return row.phone || '-';
  }

  getDonorEmail(row: InvitedDonorRow): string {
    return row.email || '-';
  }

  getDonorLevel(row: InvitedDonorRow): string {
    return row.level || '-';
  }

  getDonorCity(row: InvitedDonorRow): string {
    return row.city || '-';
  }

  getDonorNeighborhood(row: InvitedDonorRow): string {
    return row.neighborhood || '-';
  }

  getDonorCountryName(row: InvitedDonorRow): string {
    return row.country || '-';
  }

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
    return this.serverTotalCount > 0 && this.selectedDonors.size >= this.serverTotalCount;
  }

  async toggleAllSelection() {
    if (this.isAllSelected()) {
      this.deselectAll();
    } else {
      await this.selectAll();
    }
  }

  async selectAll() {
    this.loading = true;
    try {
      const allIds = await DonorController.findFilteredIds();
      allIds.forEach(id => this.selectedDonors.add(id));
    } finally {
      this.loading = false;
    }
  }

  deselectAll() {
    this.selectedDonors.clear();
  }

  get selectedCount(): number {
    return this.selectedDonors.size;
  }

  private loadFiltersFromCampaign() {
    if (!this.campaign) return;
    if (!this.campaign.invitedDonorFilters) {
      this.campaign.invitedDonorFilters = {};
    }

    const filters = this.campaign.invitedDonorFilters;
    if (filters.selectedCountry !== undefined) this.selectedCountry = filters.selectedCountry;
    if (filters.selectedCity !== undefined) this.selectedCity = filters.selectedCity;
    if (filters.selectedNeighborhood !== undefined) this.selectedNeighborhood = filters.selectedNeighborhood;
    if (filters.selectedCircleId !== undefined) this.selectedCircleId = filters.selectedCircleId;
    if (filters.includeAlumni !== undefined) this.includeAlumni = filters.includeAlumni;
    if (filters.excludeAlumni !== undefined) this.excludeAlumni = filters.excludeAlumni;
    if (filters.showOnlySelected !== undefined) this.showOnlySelected = filters.showOnlySelected;
    if (filters.showSelectedFirst !== undefined) this.showSelectedFirst = filters.showSelectedFirst;
  }

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

  get displayedDonors(): InvitedDonorRow[] {
    return this.invitedDonors;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPage();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPage();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPage();
    }
  }

  firstPage() {
    this.currentPage = 1;
    this.loadPage();
  }

  lastPage() {
    this.currentPage = this.totalPages;
    this.loadPage();
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

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;

    if (['firstName', 'lastName'].includes(field)) {
      this.loadPage();
    } else if (['phone', 'email', 'city'].includes(field)) {
      this.invitedDonors = this.sortRowsByField(this.invitedDonors, field, this.sortDirection);
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  onFreeSearchChange() {
    this.currentPage = 1;
    this.loadPage();
  }

  onShowOnlySelectedChange() {
    this.currentPage = 1;
    this.loadPage();
  }

  onShowSelectedFirstChange() {
    if (this.showSelectedFirst) {
      this.invitedDonors = this.sortRowsBySelection(this.invitedDonors);
    } else {
      this.loadPage();
    }
  }

  get totalFilteredCount(): number {
    return this.serverTotalCount;
  }
}
