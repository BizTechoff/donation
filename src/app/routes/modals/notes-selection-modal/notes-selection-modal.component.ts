import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { I18nService } from '../../../i18n/i18n.service';
import { remult } from 'remult';
import { DonorNote, NoteType } from '../../../../shared/entity';

export interface NotesSelectionModalArgs {
  noteTypes: NoteType[];
  title?: string;
}

export interface NoteSelectionResult {
  noteType: string;
  noteTypeId?: string;
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

  noteTypes: NoteType[] = [];
  filteredNoteTypes: NoteType[] = [];
  selectedNoteType: NoteType | null = null;
  noteContent: string = '';

  // Search and creation
  searchTerm = '';
  showCreateNewType = false;
  newNoteType = '';

  // Edit mode
  editingNoteType: NoteType | null = null;
  editedNoteTypeName: string = '';

  // Repositories
  donorNoteRepo = remult.repo(DonorNote);
  noteTypeRepo = remult.repo(NoteType);

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
      type.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Select note type
  selectNoteType(noteType: NoteType) {
    this.selectedNoteType = noteType;
    this.noteContent = '';
  }

  // Create a new note type
  async createNewNoteType() {
    if (!this.newNoteType.trim()) {
      alert('יש להזין שם לסוג ההערה');
      return;
    }

    // Check if already exists
    if (this.noteTypes.some(nt => nt.name === this.newNoteType.trim())) {
      alert('סוג הערה זה כבר קיים');
      return;
    }

    try {
      // Create and save new note type to database
      const newType = this.noteTypeRepo.create({
        name: this.newNoteType.trim(),
        sortOrder: this.noteTypes.length,
        isActive: true
      });

      await this.noteTypeRepo.save(newType);

      // Add to local list
      this.noteTypes.push(newType);
      this.filteredNoteTypes = [...this.noteTypes];

      // Select the new type
      this.selectNoteType(newType);

      // Reset form
      this.newNoteType = '';
      this.showCreateNewType = false;

      console.log('Created new note type:', newType.name);
    } catch (error) {
      console.error('Error creating note type:', error);
      alert('שגיאה ביצירת סוג הערה חדש');
    }
  }

  // Toggle create new type form
  toggleCreateNewType() {
    this.showCreateNewType = !this.showCreateNewType;
    if (this.showCreateNewType) {
      this.newNoteType = '';
    }
  }

  // Start editing a note type
  startEditNoteType(noteType: NoteType, event: Event) {
    event.stopPropagation();
    this.editingNoteType = noteType;
    this.editedNoteTypeName = noteType.name;
  }

  // Save edited note type
  async saveEditNoteType() {
    if (!this.editedNoteTypeName.trim() || !this.editingNoteType) {
      return;
    }

    // Check if new name already exists (and it's not the same type)
    if (this.editedNoteTypeName.trim() !== this.editingNoteType.name &&
        this.noteTypes.some(nt => nt.name === this.editedNoteTypeName.trim())) {
      alert('סוג הערה זה כבר קיים');
      return;
    }

    try {
      // Update the note type in database
      this.editingNoteType.name = this.editedNoteTypeName.trim();
      await this.noteTypeRepo.save(this.editingNoteType);

      // Refresh lists
      this.filteredNoteTypes = [...this.noteTypes];

      console.log('Updated note type:', this.editingNoteType.name);

      this.editingNoteType = null;
      this.editedNoteTypeName = '';
    } catch (error) {
      console.error('Error updating note type:', error);
      alert('שגיאה בעדכון סוג ההערה');
    }
  }

  // Cancel editing
  cancelEditNoteType() {
    this.editingNoteType = null;
    this.editedNoteTypeName = '';
  }

  // Delete a note type (deactivate if has associated notes)
  async deleteNoteType(noteType: NoteType, event: Event) {
    event.stopPropagation();

    try {
      // Check if any donor is using this note type
      const usageCount = await this.donorNoteRepo.count({
        noteTypeId: noteType.id,
        isActive: true
      });

      if (usageCount > 0) {
        alert(`יש ${usageCount} הערה${usageCount > 1 ? ' או יותר' : ''} שמשוייכת לסוג הערה זו, לא ניתן למחוק אותה.`);
        return;
      }

      if (!confirm(`האם למחוק את סוג ההערה "${noteType.name}"?`)) {
        return;
      }

      // Mark as inactive instead of deleting
      noteType.isActive = false;
      await this.noteTypeRepo.save(noteType);

      // Remove from local lists
      const index = this.noteTypes.findIndex(nt => nt.id === noteType.id);
      if (index > -1) {
        this.noteTypes.splice(index, 1);
        this.filteredNoteTypes = [...this.noteTypes];

        // Clear selection if deleted type was selected
        if (this.selectedNoteType?.id === noteType.id) {
          this.selectedNoteType = null;
          this.noteContent = '';
        }
      }

      console.log('Deactivated note type:', noteType.name);
    } catch (error) {
      console.error('Error deleting note type:', error);
      alert('שגיאה במחיקת סוג ההערה');
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

    // Return the selected note type name, ID, AND the updated noteTypes list
    this.dialogRef.close({
      noteType: this.selectedNoteType.name,
      noteTypeId: this.selectedNoteType.id,
      updatedNoteTypes: this.noteTypes
    });
  }

  // Close dialog without saving
  closeDialog() {
    this.dialogRef.close(null);
  }
}
