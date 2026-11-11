import { Component, ElementRef, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { formatAmount } from '../../../common/pipes/amount.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Donation, Donor, DonationMethod, Campaign, DonorGift, Gift } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { HebrewDateService } from '../../../services/hebrew-date.service';
import { PayerService } from '../../../services/payer.service';
import { DonationController } from '../../../../shared/controllers/donation.controller';
import { calculateEffectiveAmount, isPaymentBased, isStandingOrder, calculatePeriodsElapsed } from '../../../../shared/utils/donation-utils';
import { TableState } from '../../../common/table/table-state';
import { sortRows } from '../../../common/table/table-sort';
import { CommitmentController } from '../../../../shared/controllers/commitment.controller';
import { CommitmentProgress } from '../../../../shared/utils/commitment-utils';
import { deleteDonationQuestion } from '../../../common/donation-confirm';
import { isPartnerView, loadDonorNames, partnershipNameIds, partnershipNote } from '../../../../shared/utils/donation-partners';

export interface DonorDonationsModalArgs {
  donorId: string;
  donationType: 'donations' | 'gifts' | 'receipts';
  donorName?: string;
  /** שלב ג׳ 4 - רק התרומות שנזקפו להתחייבות הזו ("תרומות קשורות"). */
  commitmentId?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-donor-donations-modal',
  templateUrl: './donor-donations-modal.component.html',
  styleUrls: ['./donor-donations-modal.component.scss']
})
export class DonorDonationsModalComponent implements OnInit {
  args!: DonorDonationsModalArgs;

  donor?: Donor;
  donations: Donation[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];

  // For gifts mode
  donorGifts: DonorGift[] = [];
  gifts: Gift[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  donorGiftRepo = remult.repo(DonorGift);
  giftRepo = remult.repo(Gift);

  loading = false;

  // Payment totals for commitment donations (donationId -> total paid)
  paymentTotals: Record<string, number> = {};
  /** שלב ג׳ 4.1 - שולם מתוך התחייבות: תנועות ישנות + תרומות שנזקפו. */
  commitmentProgressMap: Partial<Record<string, CommitmentProgress>> = {};

  // Filters
  filterText = '';
  filterCampaign = '';
  filterMethod = '';
  filterStatus = '';
  filterDonationType = '';

  // Sorting

  // Pagination
  // Sorting and paging come from the shared TableState, the same one the list
  // screens use. This table loads the donor's WHOLE set in one query and pages
  // in the browser, so load() sorts the array rather than asking the server -
  // sortRows handles the values the columns actually display.
  readonly table = new TableState({
    pageSize: 50,
    // Every column in both tables, not a subset - the ones left out were the
    // ones that display a related or formatted value, which is exactly where
    // the user needs the sort most.
    sortableFields: ['donationDate', 'donationType', 'method', 'amount', 'currency',
                     'campaign', 'reason',
                     'deliveryDate', 'giftName', 'isDelivered'],
    scrollContainer: () => (this.isGiftsMode ? this.scrollableTableGifts : this.scrollableTable)?.nativeElement,
    load: async () => { this.applyPaging(); }
  });

  // Scrollable table container handles - one per mode (*ngIf keeps only one
  // alive at a time). Reset to top on every page change so paging does not
  // leave the user mid-page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;
  @ViewChild('scrollableTableGifts') scrollableTableGifts?: ElementRef<HTMLElement>;

  // Table configuration
  displayedColumns: string[] = ['donationDate', 'amount', 'currency', 'campaign', 'method', 'actions'];

  get currentDisplayedColumns(): string[] {
    if (this.isGiftsMode) {
      return ['deliveryDate', 'giftName', 'status', 'actions'];
    }
    return this.displayedColumns;
  }

currencyTypes = this.payer.getCurrencyTypesRecord()

  // Totals
  totalAmount = 0;
  totalDonations = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<DonorDonationsModalComponent>,
    private hebrewDateService: HebrewDateService,
    private payer: PayerService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  get modalTitle(): string {
    const donorName = this.donor?.lastAndFirstName || '';
    switch (this.args.donationType) {
      case 'donations':
        return this.args.commitmentId
          ? `תרומות על חשבון התחייבות - ${donorName}`
          : `תרומות של ${donorName}`;
      case 'gifts':
        return `מתנות של ${donorName}`;
      case 'receipts':
        return `קבלות של ${donorName}`;
      default:
        return `רשימה של ${donorName}`;
    }
  }

  get modalIcon(): string {
    switch (this.args.donationType) {
      case 'donations':
        return 'attach_money';
      case 'gifts':
        return 'redeem';
      case 'receipts':
        return 'receipt_long';
      default:
        return 'list';
    }
  }

  async loadData() {
    this.loading = true;
    try {
      // Load donor
      this.donor = await this.donorRepo.findId(this.args.donorId) || undefined;

      // Load related data based on donation type
      if (this.args.donationType === 'gifts') {
        await this.loadDonorGifts();
      } else {
        await Promise.all([
          this.loadDonations(),
          this.loadCampaigns(),
          this.loadDonationMethods()
        ]);
      }

      this.calculateTotals();
      this.resetToFirstPage();
    } catch (error) {
      console.error('Error loading donor donations:', error);
      this.ui.error('שגיאה בטעינת נתוני התרומות');
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    let whereClause: any = { donorId: this.args.donorId };

    // Apply filters based on donation type
    switch (this.args.donationType) {
      case 'donations':
        // הצג גם תרומות וגם התחייבויות - לא מסננים לפי donationType
        break;
      case 'receipts':
        whereClause.receiptIssued = true;
        break;
    }
    if (this.args.commitmentId) whereClause.commitmentId = this.args.commitmentId;

    this.donations = await this.donationRepo.find({
      where: whereClause,
      orderBy: { donationDate: 'desc' },
      include: {
        campaign: true,
        donationMethod: true
      }
    });

    // שלב ג׳ 8 - גם התרומות שהתורם שותף בהן: מוצגות בסוגריים ומחוץ לסה"כ
    // (נספרות אצל התורם שלהן). רק בחלון התרומות הכללי - לא בקבלות ולא בתוך התחייבות.
    if (this.args.donationType === 'donations' && !this.args.commitmentId) {
      const asPartner = await this.donationRepo.find({
        where: { donationType: { $ne: 'commitment' }, $and: [Donation.partneredWith({ donorId: this.args.donorId })] },
        orderBy: { donationDate: 'desc' },
        include: { campaign: true, donationMethod: true }
      });
      this.donations = [...this.donations, ...asPartner.filter(d => this.isPartnerRow(d))];
    }
    this.partnerNames = await loadDonorNames(partnershipNameIds(this.donations, this.args.donorId));

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = this.donations
      .filter(d => isPaymentBased(d))
      .map(d => d.id);
    if (paymentBasedIds.length > 0) {
      this.paymentTotals = await DonationController.getPaymentTotalsForCommitments(paymentBasedIds);
    } else {
      this.paymentTotals = {};
    }
    this.commitmentProgressMap = await CommitmentController.getProgress(
      this.donations.filter(d => d.donationType === 'commitment').map(d => d.id));
  }

  async loadDonorGifts() {
    this.donorGifts = await this.donorGiftRepo.find({
      where: { donorId: this.args.donorId },
      orderBy: { deliveryDate: 'desc' },
      include: {
        donor: true,
        gift: true
      }
    });
  }

  async loadCampaigns() {
    this.campaigns = await this.campaignRepo.find({
      orderBy: { name: 'asc' }
    });
  }

  async loadDonationMethods() {
    this.donationMethods = await this.donationMethodRepo.find({
      orderBy: { name: 'asc' }
    });
  }

  /** שלב ג׳ 8 - שמות לשורת השותפות (id -> שם). */
  partnerNames = new Map<string, string>();

  /** שלב ג׳ 8 - התורם הזה שותף בתרומה ולא התורם שלה: תצוגה בלבד, מחוץ לסה"כ. */
  isPartnerRow(donation: Donation): boolean {
    return isPartnerView(donation, this.args.donorId);
  }

  /** שלב ג׳ 8 - "שותף בתרומה עם X" / "שותפים בתרומה: X". */
  getPartnershipNote(donation: Donation): string {
    return partnershipNote(donation, this.partnerNames, this.args.donorId);
  }

  /** שלב ג׳ 8 - התרומות שנספרות בסיכומים: בלי אלה שהתורם רק שותף בהן. */
  private get countedDonations(): Donation[] {
    return this.filteredDonations.filter(d => !this.isPartnerRow(d));
  }

  calculateTotals() {
    if (this.args.donationType === 'gifts') {
      this.totalDonations = this.donorGifts.length;
      this.totalAmount = 0; // Gifts don't have amounts
    } else {
      const counted = this.donations.filter(d => !this.isPartnerRow(d)); // שלב ג׳ 8
      this.totalDonations = counted.length;
      this.totalAmount = counted.reduce((sum, donation) => sum + calculateEffectiveAmount(donation, this.paymentTotals[donation.id]), 0);
    }
  }

  get filteredDonations(): Donation[] {
    return this.donations.filter(donation => {
      const matchesText = !this.filterText ||
        donation.notes?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        donation.amount.toString().includes(this.filterText);

      const matchesCampaign = !this.filterCampaign ||
        donation.campaignId === this.filterCampaign;

      const matchesMethod = !this.filterMethod ||
        donation.donationMethodId === this.filterMethod;

      const matchesStatus = !this.filterStatus;

      const matchesDonationType = !this.filterDonationType ||
        donation.donationType === this.filterDonationType;

      return matchesText && matchesCampaign && matchesMethod && matchesStatus && matchesDonationType;
    });
  }

  get filteredDonorGifts(): DonorGift[] {
    return this.donorGifts.filter(dg => {
      const matchesText = !this.filterText ||
        dg.gift?.name?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        dg.notes?.toLowerCase().includes(this.filterText.toLowerCase());

      return matchesText;
    });
  }

  get isGiftsMode(): boolean {
    return this.args.donationType === 'gifts';
  }

  get deliveredGiftsCount(): number {
    return this.filteredDonorGifts.filter(dg => dg.isDelivered).length;
  }

  get pendingGiftsCount(): number {
    return this.filteredDonorGifts.filter(dg => !dg.isDelivered).length;
  }

  // תרומות מלאות + הו"ק (לא התחייבויות)
  get fullDonationsCount(): number {
    return this.countedDonations.filter(d => d.donationType !== 'commitment').length;
  }

  get fullDonationsTotal(): number {
    return this.countedDonations
      .filter(d => d.donationType !== 'commitment')
      .reduce((sum, d) => sum + calculateEffectiveAmount(d, this.paymentTotals[d.id]), 0);
  }

  // סכומי תרומות מלאות + הו"ק מקובצים לפי מטבע
  get fullDonationsByCurrency(): Array<{ symbol: string; total: number }> {
    const map = new Map<string, number>();
    this.countedDonations
      .filter(d => d.donationType !== 'commitment')
      .forEach(d => {
        const current = map.get(d.currencyId) || 0;
        map.set(d.currencyId, current + calculateEffectiveAmount(d, this.paymentTotals[d.id]));
      });
    return Array.from(map.entries()).map(([currencyId, total]) => ({
      symbol: this.currencyTypes[currencyId]?.symbol || currencyId,
      total
    }));
  }

  // התחייבויות
  get commitmentDonationsCount(): number {
    return this.countedDonations.filter(d => d.donationType === 'commitment').length;
  }

  // שלב ג׳ 4.4 - "שולם" על ההתחייבויות כאן הוא ההתקדמות (תנועות ישנות + תרומות
  // שנזקפו), כמו בכותרת הכתומה ובשורה עצמה. זו שורת תצוגה; סך התרומות
  // (getFilteredTotal) לא נוגע בזה, ולכן אין ספירה כפולה.
  private commitmentPaid(d: Donation): number {
    return this.commitmentProgressMap[d.id]?.paid ?? 0;
  }

  get commitmentDonationsTotal(): number {
    return this.countedDonations
      .filter(d => d.donationType === 'commitment')
      .reduce((sum, d) => sum + this.commitmentPaid(d), 0);
  }

  // סכומי התחייבויות מקובצים לפי מטבע (סכום ששולם על חשבונן)
  get commitmentDonationsByCurrency(): Array<{ symbol: string; total: number }> {
    const map = new Map<string, number>();
    this.countedDonations
      .filter(d => d.donationType === 'commitment')
      .forEach(d => {
        const current = map.get(d.currencyId) || 0;
        map.set(d.currencyId, current + this.commitmentPaid(d));
      });
    return Array.from(map.entries()).map(([currencyId, total]) => ({
      symbol: this.currencyTypes[currencyId]?.symbol || currencyId,
      total
    }));
  }

  getFilteredTotal(): number {
    return this.countedDonations.reduce((sum, donation) => sum + calculateEffectiveAmount(donation, this.paymentTotals[donation.id]), 0);
  }

  getCampaignName(campaignId: string): string {
    return this.campaigns.find(c => c.id === campaignId)?.name || '';
  }

  getMethodName(methodId: string): string {
    return this.donationMethods.find(m => m.id === methodId)?.name || '';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'בהמתנה';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  }

  getDonationTypeDisplay(donation: Donation): string {
    return donation.donationType === 'commitment'
      ? this.i18n.terms.commitment
      : this.i18n.terms.fullDonation;
  }

  isStandingOrderDonation(donation: Donation): boolean {
    return isStandingOrder(donation);
  }

  getAmountDisplay(donation: Donation): string {
    // שלב ג׳ 8 - אצל שותף הסכום בסוגריים: מוצג, לא נספר
    const display = this.amountDisplay(donation);
    return this.isPartnerRow(donation) ? `(${display})` : display;
  }

  private amountDisplay(donation: Donation): string {
    // Item 16 - no '.00' on whole amounts: the shared amount rule (Z16).
    const fmt = (n: number) => formatAmount(n);
    if (donation.donationType === 'commitment') {
      const p = this.commitmentProgressMap[donation.id];
      return `(${fmt(p?.paid || 0)} / ${fmt(donation.amount)})`;
    }
    if (isStandingOrder(donation)) {
      const paid = this.paymentTotals[donation.id] || 0;
      if (donation.unlimitedPayments) {
        // הו"ק ללא הגבלה: בפועל / צפי (מספר תקופות צפויות × סכום לתשלום)
        const expectedPeriods = calculatePeriodsElapsed(donation);
        const expectedAmount = expectedPeriods * donation.amount;
        return `${fmt(paid)} / ${fmt(expectedAmount)}`;
      }
      return `${fmt(paid)} / ${fmt(donation.amount)}`;
    }
    return fmt(donation.amount);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  async editDonation(donation: Donation) {
    // Open donation details modal
    const changed = await this.ui.donationDetailsDialog(donation.id);
    if (changed) {
      await this.loadDonations();
      this.calculateTotals();
    }
  }

  async deleteDonation(donation: Donation) {
    if (await this.ui.yesNoQuestion(deleteDonationQuestion(this.i18n.currentTerms.confirmDeleteDonation,
      this.donor?.lastAndFirstName, donation.amount, this.currencyTypes[donation.currencyId]?.symbol))) {
      try {
        await this.donationRepo.delete(donation);
        await this.loadDonations();
        this.calculateTotals();
        this.ui.info('התרומה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donation:', error);
        this.ui.error('שגיאה במחיקת התרומה');
      }
    }
  }


  async addNew() {
    if (this.isGiftsMode) {
      // Add new gift
      const result = await this.ui.donorGiftDetailsDialog('new', {
        donorId: this.args.donorId
      });
      if (result) {
        await this.loadDonorGifts();
        this.calculateTotals();
      }
    } else {
      // Add new donation
      const result = await this.ui.donationDetailsDialog('new', {
        donorId: this.args.donorId
      });
      if (result) {
        await this.loadDonations();
        this.calculateTotals();
      }
    }
  }

  getPaymentMethodDisplayName(method: DonationMethod): string {
    const typeLabels: { [key: string]: string } = {
      cash: this.i18n.terms.cash,
      check: this.i18n.terms.check,
      credit_card: this.i18n.terms.credit_card,
      bank_transfer: this.i18n.terms.bank_transfer,
      standing_order: this.i18n.terms.standingOrder,
      association: this.i18n.terms.other
    };
    return typeLabels[method.type] || method.name;
  }

  // Gift-related methods
  async editDonorGift(donorGift: DonorGift) {
    // Open donor gift details modal
    const changed = await this.ui.donorGiftDetailsDialog(donorGift.id);
    if (changed) {
      await this.loadDonorGifts();
      this.calculateTotals();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    if (await this.ui.yesNoQuestion(`האם אתה בטוח שברצונך למחוק את המתנה "${donorGift.gift?.name}"?`)) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.loadDonorGifts();
        this.calculateTotals();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donor gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  getGiftStatusText(isDelivered: boolean): string {
    return isDelivered ? 'נמסרה' : 'ממתינה';
  }

  getGiftStatusClass(isDelivered: boolean): string {
    return isDelivered ? 'status-completed' : 'status-pending';
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

  // Sorting methods
  // Sorting and paging live in `table` (TableState); the rows themselves are
  // sorted by the shared sortRows, which reads the value each column displays.
  private applyPaging() {
    this.table.totalCount = this.isGiftsMode
      ? this.filteredDonorGifts.length
      : this.filteredDonations.length;
  }

  /** Anything that changes the result set - a filter, a reload - starts over. */
  private resetToFirstPage() {
    this.table.reloadFromFirstPage();
  }

  // These getters run on every change-detection pass, so they must stay PURE -
  // assigning table.totalCount from inside one is what produces Angular's
  // ExpressionChangedAfterItHasBeenChecked. The count is set in applyPaging(),
  // which every path that changes the result set calls.
  get paginatedDonations(): Donation[] {
    const sorted = sortRows(this.filteredDonations, this.table.sortColumns, {
      // The columns that show a related value have no such property on the row.
      campaign: d => this.getCampaignName(d.campaignId),
      method: d => d.donationType === 'commitment' ? '' : this.getMethodName(d.donationMethodId),
      currency: d => d.currencyId,
      // Sort by the numeric amount even though the cell can read "paid / total".
      amount: d => d.amount
    });
    const start = (this.table.currentPage - 1) * this.table.pageSize;
    return sorted.slice(start, start + this.table.pageSize);
  }

  get paginatedDonorGifts(): DonorGift[] {
    const sorted = sortRows(this.filteredDonorGifts, this.table.sortColumns, {
      giftName: g => g.gift?.name || '',
      isDelivered: g => g.isDelivered
    });
    const start = (this.table.currentPage - 1) * this.table.pageSize;
    return sorted.slice(start, start + this.table.pageSize);
  }

  /** A filter changes the result set - recount and go back to page 1. */
  onFilterChanged() {
    this.resetToFirstPage();
  }

  closeModal() {
    this.dialogRef.close();
  }
}