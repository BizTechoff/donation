import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { remult } from 'remult';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Campaign, Donation, DonationMethod, Donor } from '../../../shared/entity';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { GlobalFilterService } from '../../services/global-filter.service';

@Component({
  selector: 'app-donations-list',
  templateUrl: './donations-list.component.html',
  styleUrls: ['./donations-list.component.scss']
})
export class DonationsListComponent implements OnInit, OnDestroy {

  donations: Donation[] = [];
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);

  loading = false;
  showAddDonationModal = false;
  editingDonation?: Donation;
  today = new Date().toISOString().split('T')[0];

  completedDonationsCountCache = 0;

  // תצוגה מקדימה ונתונים נוספים
  showPreview = false;
  hebrewDate = '';
  fundraiserName = '';

  // חיפוש תורם
  donorSearchText = '';
  private donorSearchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private route: ActivatedRoute,
    private globalFilterService: GlobalFilterService
  ) {}

  async ngOnInit() {
    // הגדרת debounce לחיפוש תורם
    this.subscriptions.add(
      this.donorSearchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(searchText => {
        this.filterDonationsByDonorName(searchText);
      })
    );

    // Set CSS variables for mobile labels
    this.updateMobileLabels();

    // Listen for language changes
    this.subscriptions.add(
      this.i18n.terms$.subscribe(() => {
        this.updateMobileLabels();
      })
    );

    // Listen for global filter changes
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.loadDonations();
      })
    );

    await this.loadData();
  }

  private updateMobileLabels() {
    const root = document.documentElement;
    root.style.setProperty('--label-donor', `'${this.i18n.terms.donor}: '`);
    root.style.setProperty('--label-amount', `'${this.i18n.terms.amount}: '`);
    root.style.setProperty('--label-currency', `'${this.i18n.terms.currency}: '`);
    root.style.setProperty('--label-payment', `'${this.i18n.terms.paymentMethod}: '`);
    root.style.setProperty('--label-campaign', `'${this.i18n.terms.campaign}: '`);
    root.style.setProperty('--label-fundraiser', `'${this.i18n.terms.fundraiser}: '`);
    root.style.setProperty('--label-receipt', `'${this.i18n.terms.receipt}: '`);
  }

  ngOnDestroy() {
    this.donorSearchSubject.complete();
    this.subscriptions.unsubscribe();
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDonations(),
        this.loadDonors(),
        this.loadCampaigns(),
        this.loadDonationMethods()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    // בנה query עם פילטרים גלובליים
    const globalFilters = this.globalFilterService.currentFilters;
    const where: any = {};

    // הוסף פילטר קמפיין אם קיים
    if (globalFilters.campaignIds && globalFilters.campaignIds.length > 0) {
      where.campaignId = { $in: globalFilters.campaignIds };
    }

    // הוסף פילטר תאריכים אם קיים
    if (globalFilters.dateFrom || globalFilters.dateTo) {
      where.donationDate = {};
      if (globalFilters.dateFrom) {
        where.donationDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        where.donationDate.$lte = globalFilters.dateTo;
      }
    }

    // הוסף פילטר סכומים אם קיים
    if (globalFilters.amountMin !== undefined || globalFilters.amountMax !== undefined) {
      where.amount = {};
      if (globalFilters.amountMin !== undefined) {
        where.amount.$gte = globalFilters.amountMin;
      }
      if (globalFilters.amountMax !== undefined) {
        where.amount.$lte = globalFilters.amountMax;
      }
    }

    this.donations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      include: {
        donor: {include: {fundraiser: true}},
        campaign: true,
        donationMethod: true,
        createdBy: true
      },
      where: Object.keys(where).length > 0 ? where : undefined
    });

    // Calculate completed donations count once after loading
    this.completedDonationsCountCache = this.donations.filter(d => d.status === 'completed').length;
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      where: { isActive: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async loadCampaigns() {
    this.campaigns = await this.campaignRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async loadDonationMethods() {
    this.donationMethods = await this.donationMethodRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async createDonation() {
    const changed = await this.ui.donationDetailsDialog('new');
    if (changed) {
      await this.loadDonations();
    }
  }

  async editDonation(donation: Donation) {
    const changed = await this.ui.donationDetailsDialog(donation.id);
    if (changed) {
      await this.loadDonations();
    }
  }

  async saveDonation() {
    if (!this.editingDonation) return;

    try {
      await this.editingDonation.save();
      
      if (this.editingDonation.donationMethod) {
        await this.editingDonation.donationMethod.updateStats(this.editingDonation.amount);
      }
      
      if (this.editingDonation.campaign) {
        await this.editingDonation.campaign.updateRaisedAmount(this.editingDonation.amount);
      }

      await this.loadDonations(); // This will also update the cache
      this.closeModal();
    } catch (error) {
      console.error('Error saving donation:', error);
    }
  }

  async deleteDonation(donation: Donation) {
    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{donor}', donation.donor?.displayName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await donation.delete();
        await this.loadDonations(); // This will also update the cache
      } catch (error) {
        console.error('Error deleting donation:', error);
      }
    }
  }

  async issueReceipt(donation: Donation) {
    try {
      await donation.issueReceipt();
      await this.loadDonations(); // This will also update the cache
    } catch (error) {
      console.error('Error issuing receipt:', error);
    }
  }

  async cancelDonation(donation: Donation) {
    const confirmMessage = this.i18n.currentTerms.confirmCancelDonation?.replace('{donor}', donation.donor?.displayName || '') || '';
    if (confirm(confirmMessage)) {
      try {
        await donation.cancelDonation();
        await this.loadDonations(); // This will also update the cache
      } catch (error) {
        console.error('Error canceling donation:', error);
      }
    }
  }

  async uploadTransactions(donation: Donation) {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      try {
        this.loading = true;

        // Import xlsx dynamically
        const XLSX = await import('xlsx');

        // Read the file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          this.ui.error('הקובץ ריק או לא מכיל נתונים');
          return;
        }

        // Import PaymentController dynamically to avoid circular dependencies
        const { PaymentController } = await import('../../../shared/controllers/payment.controller');

        // Send to backend for processing
        const result = await PaymentController.processExcelTransactions(
          donation.id,
          jsonData as any[]
        );

        // Show results
        let message = `קליטת תנועות לתרומה של ${donation.donor?.displayName || 'תורם לא ידוע'}\n\n`;
        message += `נמצאו ${result.matched} תשלומים תואמים\n`;
        message += `נוצרו ${result.created} רשומות תשלום חדשות\n`;

        if (result.errors.length > 0) {
          message += `\nשגיאות:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n...ועוד ${result.errors.length - 5} שגיאות`;
          }
        }

        alert(message);

      } catch (error) {
        console.error('Error uploading Excel file:', error);
        this.ui.error('שגיאה בעיבוד קובץ האקסל: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
      } finally {
        this.loading = false;
      }
    };

    input.click();
  }

  closeModal() {
    this.showAddDonationModal = false;
    this.editingDonation = undefined;
    this.showPreview = false;
    this.hebrewDate = '';
    this.fundraiserName = '';
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  async saveDonationAndExit() {
    await this.saveDonation();
    // The saveDonation function already closes the modal if successful
  }

  getMethodDisplayName(method: string): string {
    if (!method) return this.i18n.currentTerms.notSpecified || '';
    switch (method) {
      case 'cash': return this.i18n.currentTerms.cash || '';
      case 'check': return this.i18n.currentTerms.check || '';
      case 'credit': return this.i18n.currentTerms.creditCard || '';
      case 'transfer': return this.i18n.currentTerms.bankTransfer || '';
      case 'standing': return this.i18n.currentTerms.standingOrder || '';
      default: return this.i18n.currentTerms.notSpecified || '';
    }
  }

  getCampaignDisplayName(campaign: string): string {
    if (!campaign) return this.i18n.currentTerms.notSpecified || '';
    switch (campaign) {
      case 'general': return this.i18n.currentTerms.general || '';
      case 'torah': return this.i18n.currentTerms.torah || '';
      case 'charity': return this.i18n.currentTerms.charity || '';
      case 'building': return this.i18n.currentTerms.building || '';
      default: return this.i18n.currentTerms.notSpecified || '';
    }
  }

  // Helper functions for preview
  getSelectedDonorName(): string {
    if (!this.editingDonation?.donorId) return '';
    const donor = this.donors.find(d => d.id === this.editingDonation!.donorId);
    return donor?.displayName || '';
  }

  getSelectedMethodName(): string {
    if (!this.editingDonation?.donationMethodId) return this.i18n.currentTerms.notSpecified || '';
    const method = this.donationMethods.find(m => m.id === this.editingDonation!.donationMethodId);
    if (!method) return this.i18n.currentTerms.notSpecified || '';

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

  getSelectedCampaignName(): string {
    if (!this.editingDonation?.campaignId) return this.i18n.currentTerms.notSpecified || '';
    const campaign = this.campaigns.find(c => c.id === this.editingDonation!.campaignId);
    return campaign?.name || this.i18n.currentTerms.notSpecified || '';
  }

  getCurrencySymbol(): string {
    switch (this.editingDonation?.currency) {
      case 'ILS': return '₪';
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₪';
    }
  }

  // Getter and setter for date input
  get donationDateForInput(): string {
    return this.editingDonation?.donationDate?.toISOString().split('T')[0] || '';
  }

  set donationDateForInput(value: string) {
    if (this.editingDonation && value) {
      this.editingDonation.donationDate = new Date(value);
    }
  }

  get totalAmount(): number {
    return this.donations
      // .filter(d => d.status === 'completed')
      .reduce((sum, donation) => sum + donation.amount, 0);
  }

  get pendingAmount(): number {
    return this.donations
      .filter(d => d.status === 'pending')
      .reduce((sum, donation) => sum + donation.amount, 0);
  }

  getDonorName(donation: Donation): string {
    return donation.donor?.displayName || this.i18n.currentTerms.unknown || '';
  }

  getCampaignName(donation: Donation): string {
    return donation.campaign?.name || this.i18n.currentTerms.withoutCampaign || '';
  }

  getCurrencyName(currencyCode: string): string {
    const currencyMap: { [key: string]: string } = {
      'ILS': '₪',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CHF': 'Fr'
    };
    return currencyMap[currencyCode] || currencyCode;
  }

  getMethodName(donation: Donation): string {
    if (!donation.donationMethod) return this.i18n.currentTerms.notSpecified || '';

    const typeLabels: { [key: string]: string } = {
      cash: this.i18n.terms.cash,
      check: this.i18n.terms.check,
      credit_card: this.i18n.terms.credit_card,
      bank_transfer: this.i18n.terms.bank_transfer,
      standing_order: this.i18n.terms.standingOrder,
      association: this.i18n.terms.other
    };

    return typeLabels[donation.donationMethod.type] || donation.donationMethod.name;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return this.i18n.currentTerms.pending || '';
      case 'completed': return this.i18n.currentTerms.completed || '';
      case 'cancelled': return this.i18n.currentTerms.cancelled || '';
      default: return status;
    }
  }

  get completedDonationsCount(): number {
    return this.completedDonationsCountCache;
  }

  // תרומות מסוננות - רק עם קמפיין
  get donationsWithCampaign(): Donation[] {
    return this.donations.filter(donation => donation.campaignId);
  }

  // רשימת תורמים מסוננת לפי פילטר גלובלי
  get filteredDonors(): Donor[] {
    const globalFilters = this.globalFilterService.currentFilters;

    // אם אין פילטרים גלובליים, החזר את כל התורמים
    if (!globalFilters.countryIds || globalFilters.countryIds.length === 0) {
      return this.donors;
    }

    // סנן תורמים לפי מדינה
    return this.donors.filter(donor =>
      donor.countryId && globalFilters.countryIds!.includes(donor.countryId)
    );
  }

  // מטפל בשינוי בשדה חיפוש תורם
  onDonorSearchChange(searchText: string) {
    this.donorSearchSubject.next(searchText);
  }

  // מסנן תרומות לפי שם תורם
  async filterDonationsByDonorName(searchText: string) {
    if (!searchText || searchText.trim().length === 0) {
      // אם אין טקסט חיפוש, טען את כל התרומות
      await this.loadDonations();
      return;
    }

    const searchLower = searchText.toLowerCase().trim();

    // שלב 1: מצא תורמים מתאימים
    const matchingDonors = await this.donorRepo.find({
      where: {
        $or: [
          { firstName: { $contains: searchLower } },
          { lastName: { $contains: searchLower } },
          { firstNameEnglish: { $contains: searchLower } },
          { lastNameEnglish: { $contains: searchLower } }
        ]
      }
    });

    // אם לא נמצאו תורמים, החזר רשימה רקה
    if (matchingDonors.length === 0) {
      this.donations = [];
      this.completedDonationsCountCache = 0;
      return;
    }

    // שלב 2: מצא תרומות של התורמים המתאימים
    const donorIds = matchingDonors.map(d => d.id);

    // בנה query עם פילטרים גלובליים
    const globalFilters = this.globalFilterService.currentFilters;
    const where: any = {
      donorId: { $in: donorIds }
    };

    // הוסף פילטר קמפיין אם קיים
    if (globalFilters.campaignIds && globalFilters.campaignIds.length > 0) {
      where.campaignId = { $in: globalFilters.campaignIds };
    }

    // הוסף פילטר תאריכים אם קיים
    if (globalFilters.dateFrom || globalFilters.dateTo) {
      where.donationDate = {};
      if (globalFilters.dateFrom) {
        where.donationDate.$gte = globalFilters.dateFrom;
      }
      if (globalFilters.dateTo) {
        where.donationDate.$lte = globalFilters.dateTo;
      }
    }

    // הוסף פילטר סכומים אם קיים
    if (globalFilters.amountMin !== undefined || globalFilters.amountMax !== undefined) {
      where.amount = {};
      if (globalFilters.amountMin !== undefined) {
        where.amount.$gte = globalFilters.amountMin;
      }
      if (globalFilters.amountMax !== undefined) {
        where.amount.$lte = globalFilters.amountMax;
      }
    }

    this.donations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      include: {
        donor: {include: {fundraiser: true}},
        campaign: true,
        donationMethod: true,
        createdBy: true
      },
      where
    });
    this.completedDonationsCountCache = this.donations.filter(d => d.status === 'completed').length;
  }
}