import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { DonorAddressType } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { UIToolsService } from '../../../common/UIToolsService';

export interface DonorAddressTypeSelectionModalArgs {
  title?: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '700px',
  maxHeight: '90vh'
})
@Component({
  selector: 'app-donor-address-type-selection-modal',
  templateUrl: './donor-address-type-selection-modal.component.html',
  styleUrls: ['./donor-address-type-selection-modal.component.scss']
})
export class DonorAddressTypeSelectionModalComponent implements OnInit {
  args!: DonorAddressTypeSelectionModalArgs;
  selectedAddressType: DonorAddressType | null = null;

  // Address Types system
  availableAddressTypes: DonorAddressType[] = [];
  addressTypeRepo = remult.repo(DonorAddressType);

  // Search
  searchTerm = '';
  loading = false;

  // New address type
  showNewAddressTypeForm = false;
  newAddressTypeName = '';
  newAddressTypeDescription = '';
  savingNewAddressType = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>,
    private ui: UIToolsService
  ) {}

  async ngOnInit() {
    await this.loadAddressTypes();
  }

  async loadAddressTypes() {
    this.loading = true;
    try {
      this.availableAddressTypes = await this.addressTypeRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('Error loading address types:', error);
      this.ui.error('שגיאה בטעינת סוגי כתובות');
    } finally {
      this.loading = false;
    }
  }

  // Filter address types based on search term
  getFilteredAddressTypes(): DonorAddressType[] {
    if (!this.searchTerm.trim()) {
      return this.availableAddressTypes;
    }

    return this.availableAddressTypes.filter(type =>
      type.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select address type and close dialog
  selectAddressType(type: DonorAddressType) {
    this.selectedAddressType = type;
    setTimeout(() => {
      this.dialogRef.close(type);
    }, 100);
  }

  // Show new address type form
  showCreateNewForm() {
    this.showNewAddressTypeForm = true;
    this.newAddressTypeName = '';
    this.newAddressTypeDescription = '';
  }

  // Cancel creating new address type
  cancelNewAddressType() {
    this.showNewAddressTypeForm = false;
    this.newAddressTypeName = '';
    this.newAddressTypeDescription = '';
  }

  // Create new address type
  async createNewAddressType() {
    if (!this.newAddressTypeName.trim()) {
      this.ui.error('נא להזין שם סוג כתובת');
      return;
    }

    this.savingNewAddressType = true;
    try {
      const newType = await this.addressTypeRepo.insert({
        name: this.newAddressTypeName.trim(),
        description: this.newAddressTypeDescription.trim(),
        isActive: true
      });

      console.log('Address type created successfully:', newType);

      // Reload list
      await this.loadAddressTypes();

      // Select the newly created type
      this.selectAddressType(newType);
    } catch (error) {
      console.error('Error creating address type:', error);
      this.ui.error('שגיאה ביצירת סוג כתובת');
    } finally {
      this.savingNewAddressType = false;
    }
  }

  clearSearch() {
    this.searchTerm = '';
  }

  closeDialog() {
    this.dialogRef.close(null);
  }
}
