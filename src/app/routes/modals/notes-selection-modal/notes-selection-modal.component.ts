import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { remult } from 'remult';
import { DonorNote } from '../../../../shared/entity';

export interface NotesSelectionModalArgs {
  noteTypes: string[];
  title?: string;
}

export interface NoteSelectionResult {
  noteType: string;
  content: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px'
})
@Component({
  selector: 'app-notes-selection-modal',
  templateUrl: './notes-selection-modal.component.html',
  styleUrls: ['./notes-selection-modal.component.scss']
})
export class NotesSelectionModalComponent implements OnInit {
  args!: NotesSelectionModalArgs;

  noteTypes: string[] = [];
  filteredNoteTypes: string[] = [];
  selectedNoteType: string | null = null;
  noteContent: string = '';

  // Search and creation
  searchTerm = '';
  showCreateNewType = false;
  newNoteType = '';

  // Edit mode
  editingNoteType: string | null = null;
  editedNoteTypeName: string = '';

  // Repository for checking usage
  donorNoteRepo = remult.repo(DonorNote);

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<NotesSelectionModalComponent>
  ) {}

  async ngOnInit() {
    this.noteTypes = [...(this.args.noteTypes || [])];
    this.filteredNoteTypes = [...this.noteTypes];
  }

  // Filter note types based on search term
  filterNoteTypes() {
    if (!this.searchTerm.trim()) {
      this.filteredNoteTypes = [...this.noteTypes];
      return;
    }

    this.filteredNoteTypes = this.noteTypes.filter(type =>
      type.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select note type
  selectNoteType(noteType: string) {
    this.selectedNoteType = noteType;
    this.noteContent = '';
  }

  // Create a new note type
  createNewNoteType() {
    if (!this.newNoteType.trim()) {
      alert('יש להזין שם לסוג ההערה');
      return;
    }

    // Check if already exists
    if (this.noteTypes.includes(this.newNoteType.trim())) {
      alert('סוג הערה זה כבר קיים');
      return;
    }

    // Add to note types
    this.noteTypes.push(this.newNoteType.trim());
    this.filteredNoteTypes = [...this.noteTypes];

    // Select the new type
    this.selectNoteType(this.newNoteType.trim());

    // Reset form
    this.newNoteType = '';
    this.showCreateNewType = false;
  }

  // Toggle create new type form
  toggleCreateNewType() {
    this.showCreateNewType = !this.showCreateNewType;
    if (this.showCreateNewType) {
      this.newNoteType = '';
    }
  }

  // Start editing a note type
  startEditNoteType(noteType: string, event: Event) {
    event.stopPropagation();
    this.editingNoteType = noteType;
    this.editedNoteTypeName = noteType;
  }

  // Save edited note type
  saveEditNoteType() {
    if (!this.editedNoteTypeName.trim() || !this.editingNoteType) {
      return;
    }

    // Check if new name already exists (and it's not the same type)
    if (this.editedNoteTypeName.trim() !== this.editingNoteType &&
        this.noteTypes.includes(this.editedNoteTypeName.trim())) {
      alert('סוג הערה זה כבר קיים');
      return;
    }

    // Find and update the note type
    const index = this.noteTypes.indexOf(this.editingNoteType);
    if (index > -1) {
      this.noteTypes[index] = this.editedNoteTypeName.trim();
      this.filteredNoteTypes = [...this.noteTypes];

      // Update selected note type if it was being edited
      if (this.selectedNoteType === this.editingNoteType) {
        this.selectedNoteType = this.editedNoteTypeName.trim();
      }
    }

    this.editingNoteType = null;
    this.editedNoteTypeName = '';
  }

  // Cancel editing
  cancelEditNoteType() {
    this.editingNoteType = null;
    this.editedNoteTypeName = '';
  }

  // Delete a note type
  async deleteNoteType(noteType: string, event: Event) {
    event.stopPropagation();

    try {
      // Check if any donor is using this note type
      const usageCount = await this.donorNoteRepo.count({
        noteType: noteType,
        isActive: true
      });

      if (usageCount > 0) {
        alert(`יש ${usageCount} תורם${usageCount > 1 ? 'ים' : ''} שמשוייך${usageCount > 1 ? 'ים' : ''} לסוג הערה זו, לא ניתן למחוק אותה עד שהיא תוסר מהתורם${usageCount > 1 ? 'ים' : ''}`);
        return;
      }

      if (!confirm(`האם למחוק את סוג ההערה "${noteType}"?`)) {
        return;
      }

      const index = this.noteTypes.indexOf(noteType);
      if (index > -1) {
        this.noteTypes.splice(index, 1);
        this.filteredNoteTypes = [...this.noteTypes];

        // Clear selection if deleted type was selected
        if (this.selectedNoteType === noteType) {
          this.selectedNoteType = null;
          this.noteContent = '';
        }
      }
    } catch (error) {
      console.error('Error deleting note type:', error);
      alert('שגיאה בבדיקת שימוש בסוג ההערה');
    }
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
    this.filterNoteTypes();
  }

  // Save note type selection - return selected type to parent
  saveNoteType() {
    if (!this.selectedNoteType) {
      alert('יש לבחור סוג הערה');
      return;
    }

    // Return the selected note type AND the updated noteTypes list
    this.dialogRef.close({
      noteType: this.selectedNoteType,
      updatedNoteTypes: this.noteTypes
    });
  }

  // Close dialog without saving
  closeDialog() {
    this.dialogRef.close(null);
  }
}
