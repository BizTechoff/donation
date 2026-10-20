import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TableState, TableLoadRequest } from '../../../common/table/table-state';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Campaign, Donation, DonationMethod } from '../../../../shared/entity';
import { CampaignDonationRow, DonationController } from '../../../../shared/controllers/donation.controller';
import { CampaignController } from '../../../../shared/controllers/campaign.controller';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { HebrewDateService } from '../../../services/hebrew-date.service';
import { PayerService } from '../../../services/payer.service';

export interface CampaignDonationsModalArgs {
  campaignId: string;
  campaignName?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-campaign-donations-modal',
  templateUrl: './campaign-donations-modal.component.html',
  styleUrls: ['./campaign-donations-modal.component.scss']
})
export class CampaignDonationsModalComponent implements OnInit {
  args!: CampaignDonationsModalArgs;

  campaign?: Campaign;
  donations: CampaignDonationRow[] = [];
  paymentTotals: Record<string, number> = {};
  dropdownDonors: { id: string; firstName: string; lastName: string; fullName: string }[] = [];
  donationMethods: DonationMethod[] = [];

  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);

  loading = false;

  // Filters
  filterText = '';
  filterDonor = '';
  filterMethod = '';
  filterType = '';

  // Sorting and paging - the shared TableState. Default order (date desc)
  // comes from the server when nothing is sorted.
  readonly table = new TableState({
    pageSize: 50,
    sortableFields: ['donor', 'donationDate', 'donationType', 'amount'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadPage(req)
  });

  // Pagination
  // Scrollable table container handle - reset to top on each data load so
  // paging does not leave the user mid-page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;


  // Table configuration
  displayedColumns: string[] = ['donationDate', 'donor', 'amount', 'currency', 'method', 'type', 'actions'];

  currencyTypes = this.payer.getCurrencyTypesRecord()

  // Totals - like donor-donations-modal
  totalDonations = 0;
  fullDonationsCount = 0;
  commitmentDonationsCount = 0;
  fullDonationsByCurrency: Array<{ symbol: string; total: number }> = [];
  commitmentDonationsByCurrency: Array<{ symbol: string; total: number }> = [];
  private totalsLoaded = false;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private hebrewDateService: HebrewDateService,
    public dialogRef: MatDialogRef<CampaignDonationsModalComponent>,
    private payer: PayerService
  ) { }

  async ngOnInit() {
    await this.loadCampaign();
    await this.loadDropdownData();
    await this.loadDonations();
  }

  async loadCampaign() {
    if (!this.args?.campaignId) return;

    try {
      const foundCampaign = await this.campaignRepo.findId(this.args.campaignId);
      if (!foundCampaign) {
        this.ui.error('הקמפיין לא נמצא');
        this.dialogRef.close();
        return;
      }
      this.campaign = foundCampaign;
    } catch (error) {
      console.error('Error loading campaign:', error);
      this.ui.error('שגיאה בטעינת הקמפיין');
    }
  }

  async loadDropdownData() {
    try {
      // Load donation methods for filter
      this.donationMethods = await this.donationMethodRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  async loadDonations() {
    await this.table.reload();
  }

  /** TableState's loader - one page, with the sort the user chose. */
  private async loadPage(req: TableLoadRequest) {
    if (!this.args?.campaignId) return;

    this.loading = true;
    try {
      const result = await DonationController.getCampaignDonationsPage({
        campaignId: this.args.campaignId,
        page: req.page,
        pageSize: req.pageSize,
        filterDonorId: this.filterDonor || undefined,
        filterMethodId: this.filterMethod || undefined,
        filterType: this.filterType || undefined,
        sortColumns: req.sort
      });

      this.donations = result.rows;
      this.table.totalCount = result.total;
      this.paymentTotals = result.paymentTotals;
      this.dropdownDonors = result.dropdownDonors;
      this.totalDonations = result.total;

      if (!this.totalsLoaded) {
        await this.loadTotalsFromAllDonations();
        this.totalsLoaded = true;
      }

      // Scroll-to-top after each load is done by TableState.

    } catch (error) {
      console.error('Error loading donations:', error);
      this.ui.error('שגיאה בטעינת התרומות');
      this.donations = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadTotalsFromAllDonations() {
    try {
      const totals = await CampaignController.getCampaignDonationTotals(this.args.campaignId);

      this.fullDonationsCount = totals.fullDonationsCount;
      this.commitmentDonationsCount = totals.commitmentDonationsCount;
      this.fullDonationsByCurrency = totals.fullDonationsByCurrency.map(c => ({
        symbol: c.symbol,
        total: c.total
      }));
      this.commitmentDonationsByCurrency = totals.commitmentDonationsByCurrency.map(c => ({
        symbol: c.symbol,
        total: c.total
      }));
    } catch (error) {
      console.error('Error loading totals:', error);
      // Fallback to empty
      this.fullDonationsCount = 0;
      this.commitmentDonationsCount = 0;
      this.fullDonationsByCurrency = [];
      this.commitmentDonationsByCurrency = [];
    }
  }

  applyFilters() {
    this.table.reloadFromFirstPage();
  }

  clearFilters() {
    this.filterText = '';
    this.filterDonor = '';
    this.filterMethod = '';
    this.filterType = '';
    this.applyFilters();
  }

  // Sorting
  // Sorting and paging: this.table (TableState) - the local toggleSort/
  // getSortIcon/isSorted and the paging methods were replaced by it.

  // Format helpers
  formatCurrency(amount: number, currency: string): string {
    if (!amount) return `0`;
    return `${this.currencyTypes[currency]?.symbol}${amount.toLocaleString('he-IL')}`;
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || currency;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  getDonorName(donation: CampaignDonationRow): string {
    return donation.donorName;
  }

  getMethodName(donation: CampaignDonationRow): string {
    if (donation.donationType === 'commitment') return '-';
    return donation.donationMethodName;
  }

  getDonationTypeDisplay(donation: CampaignDonationRow): string {
    if (donation.donationType === 'commitment') return 'התחייבות';
    if (donation.donationMethodType === 'standing_order') {
      switch (donation.standingOrderType) {
        case 'bank': return 'הו"ק בנקאית';
        case 'creditCard': return 'הו"ק כ.אשראי';
        case 'organization': return 'הו"ק עמותה';
        default: return 'הו"ק';
      }
    }
    return 'תרומה';
  }

  getPaymentMethodDisplayName(method: DonationMethod): string {
    if (method.type === 'standing_order') {
      return `${method.name} (הו"ק)`;
    }
    return method.name;
  }

  isStandingOrderDonation(donation: CampaignDonationRow): boolean {
    return donation.donationMethodType === 'standing_order';
  }

  getAmountDisplay(donation: CampaignDonationRow): string {
    const fmt = (n: number) => n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (donation.donationType === 'commitment') {
      const paid = this.paymentTotals[donation.id] || 0;
      return `(${fmt(paid)} / ${fmt(donation.amount)})`;
    }
    if (donation.donationMethodType === 'standing_order') {
      const paid = this.paymentTotals[donation.id] || 0;
      if (donation.unlimitedPayments) {
        const expectedAmount = donation.periodsElapsed * donation.amount;
        return `${fmt(paid)} / ${fmt(expectedAmount)}`;
      }
      return `${fmt(paid)} / ${fmt(donation.amount)}`;
    }
    return fmt(donation.amount);
  }

  private invalidateTotals() {
    this.totalsLoaded = false;
  }

  // Actions
  async openNewDonation() {
    if (!this.campaign) return;

    try {
      const result = await this.ui.donationDetailsDialog('new', { campaignId: this.campaign.id });

      if (result) {
        this.invalidateTotals();
        await this.loadDonations();
        await this.loadCampaign();
      }
    } catch (error: any) {
      console.error('Error opening new donation:', error);
      this.ui.error('שגיאה בפתיחת תרומה חדשה: ' + (error.message || error));
    }
  }

  async editDonation(donation: CampaignDonationRow) {
    try {
      const result = await this.ui.donationDetailsDialog(donation.id);

      if (result) {
        this.invalidateTotals();
        await this.loadDonations();
        await this.loadCampaign();
      }
    } catch (error: any) {
      console.error('Error editing donation:', error);
      this.ui.error('שגיאה בעריכת התרומה: ' + (error.message || error));
    }
  }

  async deleteDonation(donation: CampaignDonationRow) {
    const confirmMessage = `האם אתה בטוח שברצונך למחוק את התרומה של ${this.getDonorName(donation)}?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await remult.repo(Donation).delete(donation.id);
      this.snackBar.open('התרומה נמחקה בהצלחה', 'סגור', { duration: 3000 });
      this.invalidateTotals();
      await this.loadDonations();
      await this.loadCampaign();
    } catch (error: any) {
      console.error('Error deleting donation:', error);
      this.ui.error('שגיאה במחיקת התרומה: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    this.dialogRef.close(true);
  }
}
