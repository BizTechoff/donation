import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { ContactPerson } from '../../../../shared/entity/contact-person';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface ContactPersonSelectionModalArgs {
  availableContactPersons?: ContactPerson[];
  title?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-contact-person-selection-modal',
  templateUrl: './contact-person-selection-modal.component.html',
  styleUrls: ['./contact-person-selection-modal.component.scss']
})
export class ContactPersonSelectionModalComponent implements OnInit {
  args!: ContactPersonSelectionModalArgs;
  selectedContactPerson: ContactPerson | null = null;

  // Contact persons
  availableContactPersons: ContactPerson[] = [];
  contactPersonRepo = remult.repo(ContactPerson);

  // Search
  searchTerm = '';

  // New contact person form
  showNewForm = false;
  newName = '';
  newEmail = '';
  newMobile = '';
  saving = false;

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    if (this.args.availableContactPersons) {
      this.availableContactPersons = this.args.availableContactPersons;
    } else {
      // Load all contact persons if not provided
      this.availableContactPersons = await this.contactPersonRepo.find({
        orderBy: { name: 'asc' }
      });
    }
  }

  // Filter contact persons based on search term
  getFilteredContactPersons(): ContactPerson[] {
    if (!this.searchTerm.trim()) {
      return this.availableContactPersons;
    }

    const term = this.searchTerm.toLowerCase();
    return this.availableContactPersons.filter(cp =>
      cp.name.toLowerCase().includes(term) ||
      (cp.email && cp.email.toLowerCase().includes(term)) ||
      (cp.mobile && cp.mobile.includes(term))
    );
  }

  // Select contact person and close dialog
  selectContactPerson(contactPerson: ContactPerson) {
    this.selectedContactPerson = contactPerson;
    setTimeout(() => {
      this.dialogRef.close(contactPerson);
    }, 100);
  }

  // Toggle new contact person form
  toggleNewForm() {
    this.showNewForm = !this.showNewForm;
    if (!this.showNewForm) {
      this.resetNewForm();
    }
  }

  // Reset form fields
  resetNewForm() {
    this.newName = '';
    this.newEmail = '';
    this.newMobile = '';
  }

  // Save new contact person
  async saveNewContactPerson() {
    if (!this.newName.trim()) {
      return;
    }

    this.saving = true;
    try {
      const newContactPerson = await this.contactPersonRepo.save({
        name: this.newName.trim(),
        email: this.newEmail.trim() || undefined,
        mobile: this.newMobile.trim() || undefined
      });

      // Return the new contact person
      this.dialogRef.close({ newContactPerson: newContactPerson });
    } catch (error) {
      console.error('Error creating new contact person:', error);
    } finally {
      this.saving = false;
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
