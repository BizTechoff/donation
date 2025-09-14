import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Donation, Donor, Campaign, DonationMethod } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface DonationDetailsModalArgs {
  donationId: string; // Can be 'new' for new donation or donation ID
  donorId?: string; // Optional donor ID for pre-selecting donor in new donations
}

@Component({
  selector: 'app-donation-details-modal',
  templateUrl: './donation-details-modal.component.html',
  styleUrls: ['./donation-details-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DonationDetailsModalComponent implements OnInit {
  args!: DonationDetailsModalArgs;
  changed = false;

  donation!: Donation;
  originalDonationData?: string; // To track changes
  donors: Donor[] = [];
  campaigns: Campaign[] = [];
  donationMethods: DonationMethod[] = [];
  
  donationRepo = remult.repo(Donation);
  donorRepo = remult.repo(Donor);
  campaignRepo = remult.repo(Campaign);
  donationMethodRepo = remult.repo(DonationMethod);
  
  loading = false;
  isNewDonation = false;

  constructor(public i18n: I18nService) {}

  async ngOnInit() {
    await this.initializeDonation();
    await this.loadDropdownData();
  }

  private async initializeDonation() {
    if (!this.args?.donationId) return;
    
    this.loading = true;
    try {
      if (this.args.donationId === 'new') {
        this.isNewDonation = true;
        this.donation = this.donationRepo.create();
        this.donation.donationDate = new Date();
        this.donation.currency = 'ILS';
        this.donation.status = 'pending';
        
        // Pre-select donor if donorId is provided
        if (this.args.donorId) {
          this.donation.donorId = this.args.donorId;
        }
        
        this.originalDonationData = JSON.stringify(this.donation);
      } else {
        this.isNewDonation = false;
        const foundDonation = await this.donationRepo.findId(this.args.donationId);
        if (foundDonation) {
          this.donation = foundDonation;
          this.originalDonationData = JSON.stringify(this.donation);
        }
      }
    } catch (error) {
      console.error('Error initializing donation:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDropdownData() {
    try {
      // Load donors
      this.donors = await this.donorRepo.find({
        where: { isActive: true },
        orderBy: { firstName: 'asc' }
      });

      // Load campaigns
      this.campaigns = await this.campaignRepo.find({
        orderBy: { name: 'asc' }
      });

      // Load donation methods
      this.donationMethods = await this.donationMethodRepo.find({
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  }

  private hasChanges(): boolean {
    if (!this.donation || !this.originalDonationData) return false;
    return JSON.stringify(this.donation) !== this.originalDonationData;
  }

  async saveDonation() {
    if (!this.donation) return;

    try {
      const wasNew = this.isNewDonation;
      await this.donation.save();
      
      this.changed = wasNew || this.hasChanges();
      // The dialog will automatically close and return this.changed
    } catch (error) {
      console.error('Error saving donation:', error);
    }
  }

  async deleteDonation() {
    if (!this.donation) return;

    const confirmMessage = this.i18n.currentTerms.confirmDeleteDonation?.replace('{amount}', this.donation.amount.toString()) || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donation.delete();
        this.changed = true;
        // The dialog will automatically close and return this.changed
      } catch (error) {
        console.error('Error deleting donation:', error);
      }
    }
  }

  async issueReceipt() {
    if (!this.donation) return;

    try {
      await this.donation.issueReceipt();
      this.changed = true;
    } catch (error) {
      console.error('Error issuing receipt:', error);
    }
  }

  async cancelDonation() {
    if (!this.donation) return;

    const confirmMessage = this.i18n.currentTerms.confirmCancelDonation || '';
    if (confirm(confirmMessage)) {
      try {
        await this.donation.cancelDonation();
        this.changed = true;
      } catch (error) {
        console.error('Error cancelling donation:', error);
      }
    }
  }

  getDonorDisplayName(donor: Donor): string {
    return `${donor.firstName} ${donor.lastName}`.trim();
  }
}