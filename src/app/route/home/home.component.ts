import { Component, OnInit } from '@angular/core'
import { Fields, getFields, remult } from 'remult'
import { Donation } from '../../../shared/entity/donation'
import { Donor } from '../../../shared/entity/donor'
import { Campaign } from '../../../shared/entity/campaign'
import { StandingOrder } from '../../../shared/entity/standing-order'

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
  standingOrderRepo = remult.repo(StandingOrder);

  constructor() {}

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
    const donations = await this.donationRepo.find();
    this.totalDonations = donations.length;
    this.totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
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
    this.topCampaigns = await this.campaignRepo.find({
      where: { isActive: true },
      orderBy: { raisedAmount: 'desc' },
      limit: 3
    });
    this.activeCampaigns = this.topCampaigns.length;
  }

  private async loadGeneralStats() {
    const donors = await this.donorRepo.find({
      where: { isActive: true }
    });
    this.totalDonors = donors.length;

    const standingOrders = await this.standingOrderRepo.find({
      where: { status: 'active', frequency: 'monthly' }
    });
    this.monthlyRecurring = standingOrders.reduce((sum, so) => sum + so.amount, 0);
  }

  formatCurrency(amount: number): string {
    return `₪${amount.toLocaleString()}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('he-IL');
  }

  getProgressPercentage(campaign: Campaign): number {
    if (campaign.targetAmount === 0) return 0;
    return Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
  }

  // אנימציות למשתמשים לא מחוברים
  animateNumber(target: number, duration: number = 2000): void {
    // פונקציה לאנימציה של מספרים
  }
}
