import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Campaign, User } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';
import { SharedComponentsModule } from '../../../shared/shared-components.module';

export interface CampaignDetailsModalArgs {
  campaignId: string; // Can be 'new' for new campaign or campaign ID
}

@Component({
  selector: 'app-campaign-details-modal',
  templateUrl: './campaign-details-modal.component.html',
  styleUrls: ['./campaign-details-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    SharedComponentsModule
  ]
})
export class CampaignDetailsModalComponent implements OnInit {
  args!: CampaignDetailsModalArgs;
  changed = false;
  shouldClose = false;

  campaign!: Campaign;
  originalCampaignData?: string; // To track changes
  users: User[] = [];

  campaignRepo = remult.repo(Campaign);
  userRepo = remult.repo(User);

  loading = false;
  isNewCampaign = false;
  selectedManager?: User;
  selectedCreatedBy?: User;

  constructor(public i18n: I18nService, private ui: UIToolsService, private snackBar: MatSnackBar) {}

  async ngOnInit() {
    await this.initializeCampaign();
    await this.loadDropdownData();
  }

  private async initializeCampaign() {
    if (!this.args?.campaignId) return;

    this.loading = true;
    try {
      if (this.args.campaignId === 'new') {
        this.isNewCampaign = true;
        this.campaign = this.campaignRepo.create();
        this.campaign.startDate = new Date();
        this.campaign.currency = 'ILS';
        this.campaign.status = 'draft';
        this.campaign.campaignType = 'רגיל';
        this.campaign.isActive = true;
        this.campaign.isPublic = true;
        this.campaign.targetAmount = 0;
        this.campaign.raisedAmount = 0;

        this.originalCampaignData = JSON.stringify(this.campaign);
      } else {
        this.isNewCampaign = false;
        const foundCampaign = await this.campaignRepo.findId(this.args.campaignId);
        if (foundCampaign) {
          this.campaign = foundCampaign;
          this.originalCampaignData = JSON.stringify(this.campaign);
        } else {
          throw new Error(`Campaign with ID ${this.args.campaignId} not found`);
        }
      }
    } catch (error) {
      console.error('Error initializing campaign:', error);
      this.ui.error('שגיאה בטעינת נתוני הקמפיין');
    } finally {
      this.loading = false;
    }
  }

  async loadDropdownData() {
    try {
      // Load users for manager and created by fields - only donators
      this.users = await this.userRepo.find({
        where: { donator: true },
        orderBy: { name: 'asc' }
      });

      // Load selected manager and created by if they exist
      await this.loadSelectedUsers();
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  async loadSelectedUsers() {
    if (this.campaign?.managerId) {
      try {
        this.selectedManager = await this.userRepo.findId(this.campaign.managerId) || undefined;
      } catch (error) {
        console.error('Error loading selected manager:', error);
      }
    }

    if (this.campaign?.createdById) {
      try {
        this.selectedCreatedBy = await this.userRepo.findId(this.campaign.createdById) || undefined;
      } catch (error) {
        console.error('Error loading selected created by:', error);
      }
    }
  }

  async saveCampaign() {
    if (!this.campaign) return;

    try {
      this.loading = true;

      // Validate required fields
      if (!this.campaign.name?.trim()) {
        this.ui.error('שם הקמפיין הוא שדה חובה');
        return;
      }

      if (!this.campaign.startDate) {
        this.ui.error('תאריך התחלה הוא שדה חובה');
        return;
      }

      if (this.campaign.targetAmount < 0) {
        this.ui.error('יעד כספי חייב להיות חיובי');
        return;
      }

      // Set the current user as created by for new campaigns
      if (this.isNewCampaign && !this.campaign.createdById) {
        const currentUser = remult.user;
        if (currentUser?.id) {
          this.campaign.createdById = currentUser.id;
        }
      }

      await this.campaign.save();
      this.snackBar.open('הקמפיין נשמר בהצלחה', 'סגור', { duration: 3000 });
      this.originalCampaignData = JSON.stringify(this.campaign);
      this.changed = false;
      this.shouldClose = true;
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      this.ui.error('שגיאה בשמירת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async deleteCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך למחוק את הקמפיין "${this.campaign.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.delete();
      this.snackBar.open('הקמפיין נמחק בהצלחה', 'סגור', { duration: 3000 });
      this.shouldClose = true;
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      this.ui.error('שגיאה במחיקת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async activateCampaign() {
    if (!this.campaign) return;

    try {
      this.loading = true;
      await this.campaign.activate();
      this.snackBar.open('הקמפיין הופעל בהצלחה', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error activating campaign:', error);
      this.ui.error('שגיאה בהפעלת הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async completeCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך לסמן את הקמפיין "${this.campaign.name}" כהושלם?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.complete();
      this.snackBar.open('הקמפיין סומן כהושלם', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error completing campaign:', error);
      this.ui.error('שגיאה בסימון הקמפיין כהושלם: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  async cancelCampaign() {
    if (!this.campaign) return;

    const confirmMessage = `האם אתה בטוח שברצונך לבטל את הקמפיין "${this.campaign.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      this.loading = true;
      await this.campaign.cancel();
      this.snackBar.open('הקמפיין בוטל', 'סגור', { duration: 3000 });
      await this.loadSelectedUsers(); // Refresh data
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      this.ui.error('שגיאה בביטול הקמפיין: ' + (error.message || error));
    } finally {
      this.loading = false;
    }
  }

  closeModal(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // Check if there are unsaved changes
    const currentData = JSON.stringify(this.campaign);
    if (this.originalCampaignData !== currentData) {
      const confirmMessage = 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?';
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.shouldClose = true;
  }

  onManagerChange() {
    if (this.selectedManager) {
      this.campaign.managerId = this.selectedManager.id;
    } else {
      this.campaign.managerId = '';
    }
    this.markAsChanged();
  }

  onCreatedByChange() {
    if (this.selectedCreatedBy) {
      this.campaign.createdById = this.selectedCreatedBy.id;
    } else {
      this.campaign.createdById = '';
    }
    this.markAsChanged();
  }

  markAsChanged() {
    this.changed = true;
  }

  onEventLocationChange(location: string) {
    if (location) {
      // Auto-select currency based on location text
      this.selectCurrencyByLocation(location);
      this.markAsChanged();
    }
  }

  private selectCurrencyByLocation(location: string) {
    const locationLower = location.toLowerCase();

    // Check for common country/city patterns
    if (locationLower.includes('israel') || locationLower.includes('ישראל') ||
        locationLower.includes('jerusalem') || locationLower.includes('ירושלים') ||
        locationLower.includes('tel aviv') || locationLower.includes('תל אביב')) {
      this.campaign.currency = 'ILS';
    } else if (locationLower.includes('usa') || locationLower.includes('america') ||
               locationLower.includes('ארה"ב') || locationLower.includes('אמריקה') ||
               locationLower.includes('new york') || locationLower.includes('brooklyn') ||
               locationLower.includes('miami') || locationLower.includes('los angeles')) {
      this.campaign.currency = 'USD';
    } else if (locationLower.includes('canada') || locationLower.includes('קנדה') ||
               locationLower.includes('toronto') || locationLower.includes('montreal')) {
      this.campaign.currency = 'CAD';
    } else if (locationLower.includes('uk') || locationLower.includes('england') ||
               locationLower.includes('london') || locationLower.includes('בריטניה')) {
      this.campaign.currency = 'GBP';
    } else if (locationLower.includes('france') || locationLower.includes('צרפת') ||
               locationLower.includes('germany') || locationLower.includes('גרמניה') ||
               locationLower.includes('italy') || locationLower.includes('spain') ||
               locationLower.includes('netherlands') || locationLower.includes('belgium') ||
               locationLower.includes('paris') || locationLower.includes('berlin') ||
               locationLower.includes('rome') || locationLower.includes('madrid')) {
      this.campaign.currency = 'EUR';
    } else if (locationLower.includes('australia') || locationLower.includes('אוסטרליה') ||
               locationLower.includes('sydney') || locationLower.includes('melbourne')) {
      this.campaign.currency = 'AUD';
    }
  }

  getUserDisplayName(user?: User): string {
    if (!user) return '';
    return user.name || user.id || 'לא ידוע';
  }

  // Getters for status checks
  get isDraft(): boolean {
    return this.campaign?.status === 'draft';
  }

  get isActive(): boolean {
    return this.campaign?.status === 'active';
  }

  get isCompleted(): boolean {
    return this.campaign?.status === 'completed';
  }

  get isCancelled(): boolean {
    return this.campaign?.status === 'cancelled';
  }

  get canEdit(): boolean {
    return this.isDraft || this.isActive;
  }

  get canActivate(): boolean {
    return this.isDraft && !this.isNewCampaign;
  }

  get canComplete(): boolean {
    return this.isActive && !this.isNewCampaign;
  }

  get canCancel(): boolean {
    return (this.isDraft || this.isActive) && !this.isNewCampaign;
  }
}