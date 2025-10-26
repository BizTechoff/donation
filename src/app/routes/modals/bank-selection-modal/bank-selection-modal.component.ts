import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Bank } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { BankDetailsModalComponent } from '../bank-details-modal/bank-details-modal.component';

export interface BankSelectionModalArgs {
  donationId: string;
  title?: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-bank-selection-modal',
  templateUrl: './bank-selection-modal.component.html',
  styleUrls: ['./bank-selection-modal.component.scss']
})
export class BankSelectionModalComponent implements OnInit {
  args!: BankSelectionModalArgs;
  selectedBank: Bank | null = null;

  // Banks system
  availableBanks: Bank[] = [];
  bankRepo = remult.repo(Bank);

  // Search
  searchTerm = '';
  loading = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    await this.loadBanks();
  }

  async loadBanks() {
    this.loading = true;
    try {
      this.availableBanks = await this.bankRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: { place: true }
      });
    } catch (error) {
      console.error('Error loading banks:', error);
    } finally {
      this.loading = false;
    }
  }

  // Filter banks based on search term
  getFilteredBanks(): Bank[] {
    if (!this.searchTerm.trim()) {
      return this.availableBanks;
    }

    return this.availableBanks.filter(bank =>
      bank.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select bank and close dialog immediately
  selectBank(bank: Bank) {
    this.selectedBank = bank;
    setTimeout(() => {
      this.dialogRef.close(bank);
    }, 100);
  }

  // Open create new bank modal
  async createNewBank() {
    try {
      const dialogResult = await openDialog(
        BankDetailsModalComponent,
        (modal: BankDetailsModalComponent) => {
          modal.args = { bankId: undefined };
        }
      );

      if (dialogResult) {
        // Reload banks list
        await this.loadBanks();

        // If a new bank was created, select it
        if (this.availableBanks.length > 0) {
          const newestBank = this.availableBanks.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectBank(newestBank);
        }
      }
    } catch (error) {
      console.error('Error creating new bank:', error);
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
}
