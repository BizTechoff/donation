import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService, DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { CampaignController } from '../../../../shared/controllers/campaign.controller';
import { Campaign } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { CampaignDetailsModalComponent } from '../campaign-details-modal/campaign-details-modal.component';

export interface CampaignSelectionModalArgs {
  title?: string;
  excludeIds?: string[];
  selectedIds?: string[];
  multiSelect?: boolean;
  allowAddNew?: boolean;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-campaign-selection-modal',
  templateUrl: './campaign-selection-modal.component.html',
  styleUrls: ['./campaign-selection-modal.component.scss']
})
export class CampaignSelectionModalComponent implements OnInit {
  args = { allowAddNew: true } as CampaignSelectionModalArgs;
  selectedCampaign: Campaign | null = null;
  selectedCampaigns: Campaign[] = [];

  // Campaigns system
  availableCampaigns: Campaign[] = [];
  campaignRepo = remult.repo(Campaign);

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private busy: BusyService
  ) { }

  async ngOnInit() {
    await this.loadCampaigns();
  }

  async loadCampaigns() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const data = await CampaignController.getCampaignsForSelection(this.args?.excludeIds);
        this.availableCampaigns = data.campaigns;

        // Pre-select campaigns if selectedIds provided (in multi-select mode)
        if (this.args?.multiSelect && this.args?.selectedIds && this.args.selectedIds.length > 0) {
          this.selectedCampaigns = this.availableCampaigns.filter(campaign =>
            this.args.selectedIds!.includes(campaign.id)
          );
        }
      } catch (error) {
        console.error('Error loading campaigns:', error);
      }
    });
  }

  // Filter campaigns based on search term, with selected items first in multi-select mode
  getFilteredCampaigns(): Campaign[] {
    let campaigns = this.availableCampaigns;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      campaigns = campaigns.filter(campaign =>
        campaign.name?.toLowerCase().includes(term) ||
        campaign.description?.toLowerCase().includes(term)
      );
    }

    // In multi-select mode, show selected items first
    if (this.args.multiSelect) {
      const selected = campaigns.filter(c => this.isCampaignSelected(c));
      const unselected = campaigns.filter(c => !this.isCampaignSelected(c));
      return [...selected, ...unselected];
    }

    return campaigns;
  }

  // Select campaign and close dialog immediately (single select mode)
  // Or toggle campaign selection in multi-select mode
  selectCampaign(campaign: Campaign) {
    if (this.args.multiSelect) {
      this.toggleCampaignSelection(campaign);
    } else {
      this.selectedCampaign = campaign;
      setTimeout(() => {
        this.dialogRef.close(campaign);
      }, 100);
    }
  }

  // Toggle campaign selection in multi-select mode
  toggleCampaignSelection(campaign: Campaign) {
    const index = this.selectedCampaigns.findIndex(c => c.id === campaign.id);
    if (index === -1) {
      this.selectedCampaigns.push(campaign);
    } else {
      this.selectedCampaigns.splice(index, 1);
    }
  }

  // Check if campaign is selected (for multi-select mode)
  isCampaignSelected(campaign: Campaign): boolean {
    return this.selectedCampaigns.some(c => c.id === campaign.id);
  }

  // Finish multi-select and close dialog with selected campaigns
  finishMultiSelect() {
    this.dialogRef.close(this.selectedCampaigns);
  }

  // Open create new campaign modal
  async createNewCampaign() {
    try {
      const dialogResult = await openDialog(
        CampaignDetailsModalComponent,
        (modal: CampaignDetailsModalComponent) => {
          modal.args = { campaignId: 'new' };
        }
      );

      if (dialogResult) {
        await this.loadCampaigns();

        if (this.availableCampaigns.length > 0) {
          const newestCampaign = this.availableCampaigns.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectCampaign(newestCampaign);
        }
      }
    } catch (error) {
      console.error('Error creating new campaign:', error);
    }
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }

  // Get campaign display name
  getCampaignDisplayName(campaign: Campaign): string {
    return campaign.name || 'קמפיין';
  }
}
