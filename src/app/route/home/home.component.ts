import { Component, OnInit } from '@angular/core'
import { Fields, getFields, remult } from 'remult'
import { Donation } from '../../../shared/entity/donation'
import { Donor } from '../../../shared/entity/donor'
import { Campaign } from '../../../shared/entity/campaign'
import { CampaignController, CurrencyTotal } from '../../../shared/controllers/campaign.controller'
import { DonationController } from '../../../shared/controllers/donation.controller'
import { calculateEffectiveAmount, isPaymentBased } from '../../../shared/utils/donation-utils'
import { I18nService } from '../../i18n/i18n.service'
import { PayerService } from '../../services/payer.service'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  
  isLoggedIn = false;
  currentUser: any;
  
  // נתונים סטטיסטיים
  totalDonations = 0;
  totalAmount = 0;
  activeCampaigns = 0;
  totalDonors = 0;
  monthlyRecurring = 0;
  recentDonations: Donation[] = [];
  topCampaigns: Campaign[] = [];

  // Map for campaign raised amounts by currency (calculated on demand)
  campaignRaisedByCurrencyMap = new Map<string, CurrencyTotal[]>();

  // Currency types for conversion
  currencyTypes: Record<string, { symbol: string; label: string; rateInShekel: number }> = {};

  loading = true;

  // נתונים ללא התחברות - אפקט וואו
  showWelcomeAnimation = false;
  welcomeStats = {
    totalRaised: 2847650,
    donorsCount: 15842,
    campaignsCount: 127,
    yearsActive: 8
  };

  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);

  constructor(
    public i18n: I18nService,
    private payerService: PayerService
  ) {
    this.currencyTypes = this.payerService.getCurrencyTypesRecord();
  }

  async ngOnInit() {
    try {
      this.currentUser = remult.user;
      this.isLoggedIn = !!this.currentUser;
      
      if (this.isLoggedIn) {
        await this.loadDashboardData();
      } else {
        this.startWelcomeAnimation();
      }
    } catch (error) {
      this.isLoggedIn = false;
      this.startWelcomeAnimation();
    } finally {
      this.loading = false;
    }
  }

  private startWelcomeAnimation() {
    setTimeout(() => {
      this.showWelcomeAnimation = true;
    }, 500);
  }

  private async loadDashboardData() {
    try {
      await Promise.all([
        this.loadDonationStats(),
        this.loadRecentDonations(),
        this.loadTopCampaigns(),
        this.loadGeneralStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  private async loadDonationStats() {
    const donations = await this.donationRepo.find({
      include: { donationMethod: true }
    });
    this.totalDonations = donations.length;

    // Load payment totals for commitment and standing order donations
    const paymentBasedIds = donations.filter(d => isPaymentBased(d)).map(d => d.id).filter(Boolean);
    const paymentTotals = paymentBasedIds.length > 0
      ? await DonationController.getPaymentTotalsForCommitments(paymentBasedIds)
      : {};

    this.totalAmount = donations.reduce((sum, d) => sum + calculateEffectiveAmount(d, paymentTotals[d.id]), 0);
  }

  private async loadRecentDonations() {
    this.recentDonations = await this.donationRepo.find({
      orderBy: { donationDate: 'desc' },
      limit: 5,
      include: {
        donor: true,
        campaign: true
      }
    });
  }

  private async loadTopCampaigns() {
    // Load active campaigns
    const activeCampaigns = await this.campaignRepo.find({
      where: { isActive: true }
    });

    if (activeCampaigns.length > 0) {
      // Fetch raised amounts for all campaigns
      const campaignIds = activeCampaigns.map(c => c.id);
      const raisedByCurrency = await CampaignController.getRaisedAmountsByCurrency(campaignIds);

      // Build map of campaign -> currency totals
      this.campaignRaisedByCurrencyMap.clear();
      for (const item of raisedByCurrency) {
        this.campaignRaisedByCurrencyMap.set(item.campaignId, item.totals);
      }

      // Sort campaigns by raised amount (converted to ILS) descending and take top 3
      this.topCampaigns = [...activeCampaigns]
        .sort((a, b) => {
          const raisedA = this.getRaisedAmountInILS(a);
          const raisedB = this.getRaisedAmountInILS(b);
          return raisedB - raisedA;
        })
        .slice(0, 3);
    } else {
      this.topCampaigns = [];
    }

    this.activeCampaigns = activeCampaigns.length;
  }

  private getRaisedAmountInILS(campaign: Campaign): number {
    const totals = this.campaignRaisedByCurrencyMap.get(campaign.id) || [];
    return totals.reduce((sum, t) => {
      const rate = this.currencyTypes[t.currencyId]?.rateInShekel || 1;
      return sum + (t.total * rate);
    }, 0);
  }

  private async loadGeneralStats() {
    const donors = await this.donorRepo.find({
      where: { isActive: true }
    });
    this.totalDonors = donors.length;

    this.monthlyRecurring = 0;
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('he-IL');
  }

  getProgressPercentage(campaign: Campaign): number {
    if (campaign.targetAmount === 0) return 0;

    // Convert raised amounts to ILS
    const raisedInILS = this.getRaisedAmountInILS(campaign);

    // Convert target amount to ILS
    const targetRate = this.currencyTypes[campaign.currencyId]?.rateInShekel || 1;
    const targetInILS = campaign.targetAmount * targetRate;

    return Math.min(100, Math.round((raisedInILS / targetInILS) * 100));
  }

  getRaisedAmount(campaign: Campaign): number {
    // Return raised amount in ILS for display
    return this.getRaisedAmountInILS(campaign);
  }

  // אנימציות למשתמשים לא מחוברים
  animateNumber(target: number, duration: number = 2000): void {
    // פונקציה לאנימציה של מספרים
  }
}
