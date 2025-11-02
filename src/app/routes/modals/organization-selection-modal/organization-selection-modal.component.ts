import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Organization } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { OrganizationDetailsModalComponent } from '../organization-details-modal/organization-details-modal.component';

export interface OrganizationSelectionModalArgs {
  donationId: string;
  title?: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '800px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-organization-selection-modal',
  templateUrl: './organization-selection-modal.component.html',
  styleUrls: ['./organization-selection-modal.component.scss']
})
export class OrganizationSelectionModalComponent implements OnInit {
  args!: OrganizationSelectionModalArgs;
  selectedOrganization: Organization | null = null;

  // Organizations system
  availableOrganizations: Organization[] = [];
  organizationRepo = remult.repo(Organization);

  // Search
  searchTerm = '';
  loading = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    await this.loadOrganizations();
  }

  async loadOrganizations() {
    this.loading = true;
    try {
      this.availableOrganizations = await this.organizationRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      this.loading = false;
    }
  }

  // Filter organizations based on search term
  getFilteredOrganizations(): Organization[] {
    if (!this.searchTerm.trim()) {
      return this.availableOrganizations;
    }

    return this.availableOrganizations.filter(org =>
      org.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select organization and close dialog immediately
  selectOrganization(organization: Organization) {
    this.selectedOrganization = organization;
    setTimeout(() => {
      this.dialogRef.close(organization);
    }, 100);
  }

  // Open create new organization modal
  async createNewOrganization() {
    try {
      const dialogResult = await openDialog(
        OrganizationDetailsModalComponent,
        (modal: OrganizationDetailsModalComponent) => {
          modal.args = { organizationId: undefined };
        }
      );

      if (dialogResult) {
        // Reload organizations list
        await this.loadOrganizations();

        // If a new organization was created, select it
        if (this.availableOrganizations.length > 0) {
          const newestOrganization = this.availableOrganizations.reduce((prev, current) =>
            (current.createdDate > prev.createdDate) ? current : prev
          );
          this.selectOrganization(newestOrganization);
        }
      }
    } catch (error) {
      console.error('Error creating new organization:', error);
    }
  }

  // Edit existing organization
  async editOrganization(organization: Organization, event: Event) {
    event.stopPropagation(); // Prevent selecting the organization
    try {
      const dialogResult = await openDialog(
        OrganizationDetailsModalComponent,
        (modal: OrganizationDetailsModalComponent) => {
          modal.args = { organizationId: organization.id };
        }
      );

      if (dialogResult) {
        // Reload the updated organization
        await this.loadOrganizations();
      }
    } catch (error) {
      console.error('Error editing organization:', error);
    }
  }

  // Delete organization
  async deleteOrganization(organization: Organization, event: Event) {
    event.stopPropagation(); // Prevent selecting the organization

    if (!confirm(`האם אתה בטוח שברצונך למחוק את העמותה "${organization.name}"?`)) {
      return;
    }

    try {
      await this.organizationRepo.delete(organization);

      // Remove from local list
      this.availableOrganizations = this.availableOrganizations.filter(o => o.id !== organization.id);
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('שגיאה במחיקת העמותה. ייתכן שהעמותה מקושרת לתרומות קיימות.');
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
