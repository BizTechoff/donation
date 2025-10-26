import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Company } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { CompanyDetailsModalComponent } from '../company-details-modal/company-details-modal.component';

export interface CompanySelectionModalArgs {
  availableCompanies: Company[];
  title?: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-company-selection-modal',
  templateUrl: './company-selection-modal.component.html',
  styleUrls: ['./company-selection-modal.component.scss']
})
export class CompanySelectionModalComponent implements OnInit {
  args!: CompanySelectionModalArgs;
  selectedCompany: Company | null = null;

  // Companies system
  availableCompanies: Company[] = [];
  companyRepo = remult.repo(Company);

  // Search
  searchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    this.availableCompanies = this.args.availableCompanies || [];
  }

  // Filter companies based on search term
  getFilteredCompanies(): Company[] {
    if (!this.searchTerm.trim()) {
      return this.availableCompanies;
    }

    return this.availableCompanies.filter(company =>
      company.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select company and close dialog immediately
  selectCompany(company: Company) {
    this.selectedCompany = company;
    setTimeout(() => {
      this.dialogRef.close(company);
    }, 100);
  }

  // Open create new company modal
  async createNewCompany() {
    try {
      const dialogResult = await openDialog(
        CompanyDetailsModalComponent,
        (modal: CompanyDetailsModalComponent) => {
          modal.args = { companyId: undefined };
        }
      );

      if (dialogResult && typeof dialogResult === 'object' && 'companyId' in dialogResult) {
        // Reload the new company and return it
        const newCompany = await this.companyRepo.findId((dialogResult as any).companyId, {
          include: { place: true }
        });
        if (newCompany) {
          this.dialogRef.close({ newCompany: newCompany });
        }
      }
    } catch (error) {
      console.error('Error creating new company:', error);
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
