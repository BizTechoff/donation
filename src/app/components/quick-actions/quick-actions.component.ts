import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule
  ]
})
export class QuickActionsComponent {
  
  constructor(
    private ui: UIToolsService,
    public i18n: I18nService,
    private router: Router
  ) {}
  
  async createNewDonation() {
    const changed = await this.ui.donationDetailsDialog('new');
    // No need to navigate or refresh since it's a modal
  }
  
  async createNewDonor() {
    const changed = await this.ui.donorDetailsDialog('new');
    // No need to navigate or refresh since it's a modal
  }
  
 async createNewCampaign() {
    const changed = await this.ui.campaignDetailsDialog('new');
    // this.router.navigate(['/קמפיינים'], { 
    //   queryParams: { action: 'add' }
    // });
  }
  
  createNewStandingOrder() {
    this.router.navigate(['/הוראות קבע'], { 
      queryParams: { action: 'add' }
    });
  }
  
  createNewCertificate() {
    this.router.navigate(['/תעודות'], { 
      queryParams: { action: 'add' }
    });
  }
  
  openBlessingsBook() {
    // This might need to be implemented based on your blessings functionality
    this.router.navigate(['/דוחות'], { 
      queryParams: { tab: 'blessings' }
    });
  }
  
  // Method to get the icon for each action
  getActionIcon(action: string): string {
    switch (action) {
      case 'donation': return 'payment';
      case 'donor': return 'person_add';
      case 'campaign': return 'campaign';
      case 'standing-order': return 'schedule';
      case 'certificate': return 'card_membership';
      case 'blessings': return 'auto_stories';
      default: return 'add';
    }
  }
}