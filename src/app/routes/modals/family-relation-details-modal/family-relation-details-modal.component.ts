import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { remult } from 'remult';
import { Donor, DonorRelation } from '../../../../shared/entity';
import { I18nService } from '../../../i18n/i18n.service';
import { DonorSelectionModalComponent } from '../donor-selection-modal/donor-selection-modal.component';

export interface FamilyRelationDetailsModalArgs {
  relationId?: string; // Can be undefined for new relation
  currentDonorId: string; // The donor we're adding a relation to
  allDonors: Donor[]; // All available donors to select from
  existingRelationDonorIds?: string[]; // IDs of donors already related
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '600px',
  maxHeight: '90vh',
  panelClass: 'family-relation-dialog-panel'
})
@Component({
  selector: 'app-family-relation-details-modal',
  templateUrl: './family-relation-details-modal.component.html',
  styleUrls: ['./family-relation-details-modal.component.scss']
})
export class FamilyRelationDetailsModalComponent implements OnInit {
  args!: FamilyRelationDetailsModalArgs;

  relation?: DonorRelation;
  donorRelationRepo = remult.repo(DonorRelation);
  donorRepo = remult.repo(Donor);
  isNewRelation = false;

  newRelationshipType: string = '';
  selectedDonor?: Donor;
  selectedDonorId: string = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) { }

  async ngOnInit() {
    if (!this.args) return;

    if (this.args.relationId) {
      // Editing existing relation
      this.isNewRelation = false;
      try {
        const foundRelation = await this.donorRelationRepo.findId(this.args.relationId, {
          include: { donor1: true, donor2: true }
        });
        if (foundRelation) {
          this.relation = foundRelation;

          // Determine which donor is the related one and use the correct relationship type
          if (this.relation.donor1Id === this.args.currentDonorId) {
            this.selectedDonorId = this.relation.donor2Id;
            this.selectedDonor = this.relation.donor2;
            this.newRelationshipType = this.relation.relationshipType1;
          } else {
            // Current donor is donor2, need to calculate reverse relationship
            // Note: In edit mode, we always swap to make current donor as donor1
            this.selectedDonorId = this.relation.donor1Id;
            this.selectedDonor = this.relation.donor1;
            this.newRelationshipType = this.relation.relationshipType1;
          }
        }
      } catch (error) {
        console.error('Error loading relation:', error);
      }
    } else {
      // Creating new relation
      this.isNewRelation = true;
      this.relation = this.donorRelationRepo.create({
        donor1Id: this.args.currentDonorId,
        donor2Id: '',
        relationshipType1: ''
      });
    }

    // Prevent accidental close for new relation
    if (this.isNewRelation) {
      this.dialogRef.disableClose = true;
    }
  }

  async saveRelation() {
    if (!this.relation || !this.newRelationshipType || !this.selectedDonorId) {
      alert('נא למלא את כל השדות');
      return;
    }

    try {
      // Always save with current donor as donor1
      // relationshipType2 will be calculated dynamically when loading
      this.relation.donor1Id = this.args.currentDonorId;
      this.relation.donor2Id = this.selectedDonorId;
      this.relation.relationshipType1 = this.newRelationshipType;

      // Return the relation object (unsaved) - will be saved when donor is saved
      this.dialogRef.close(this.relation);
    } catch (error) {
      console.error('Error saving relation:', error);
      alert('שגיאה בשמירת הקשר');
    }
  }

  closeModal() {
    this.dialogRef.close(false);
  }

  async openDonorSelectionModal() {
    try {
      const result = await openDialog(
        DonorSelectionModalComponent,
        (modal: DonorSelectionModalComponent) => {
          modal.args = {
            title: 'בחירת תורם לקשר משפחתי',
            multiSelect: false,
            excludeIds: [
              this.args.currentDonorId,
              ...(this.args.existingRelationDonorIds || [])
            ]
          };
        }
      ) as Donor | null;

      if (result) {
        this.selectedDonor = result;
        this.selectedDonorId = result.id;
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
      alert('שגיאה בפתיחת חלון בחירת תורם');
    }
  }
}
