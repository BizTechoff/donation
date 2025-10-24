import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig, openDialog } from 'common-ui-elements';
import { Circle } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';
import { CircleDetailsModalComponent } from '../circle-details-modal/circle-details-modal.component';

export interface CircleSelectionModalArgs {
  availableCircles: Circle[];
  title?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-circle-selection-modal',
  templateUrl: './circle-selection-modal.component.html',
  styleUrls: ['./circle-selection-modal.component.scss']
})
export class CircleSelectionModalComponent implements OnInit {
  args!: CircleSelectionModalArgs;
  selectedCircle: Circle | null = null;

  // Circles system
  availableCircles: Circle[] = [];
  circleRepo = remult.repo(Circle);

  // Search
  circleSearchTerm = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    this.availableCircles = this.args.availableCircles || [];
  }

  // Filter circles based on search term
  getFilteredCircles(): Circle[] {
    if (!this.circleSearchTerm.trim()) {
      return this.availableCircles;
    }

    return this.availableCircles.filter(circle =>
      circle.name.toLowerCase().includes(this.circleSearchTerm.toLowerCase()) ||
      (circle.nameEnglish && circle.nameEnglish.toLowerCase().includes(this.circleSearchTerm.toLowerCase()))
    );
  }

  // Select circle and close dialog immediately
  selectCircle(circle: Circle) {
    this.selectedCircle = circle;
    // Use setTimeout to ensure the dialog closes after the selection is processed
    setTimeout(() => {
      this.dialogRef.close(circle);
    }, 100);
  }

  // Open create new circle modal
  async createNewCircle() {
    try {
      const dialogResult = await openDialog(
        CircleDetailsModalComponent,
        (modal: CircleDetailsModalComponent) => {
          modal.args = { circleId: undefined };
        }
      );

      if (dialogResult && typeof dialogResult === 'object' && 'circleId' in dialogResult) {
        // Reload the new circle and return it
        const newCircle = await this.circleRepo.findId((dialogResult as any).circleId);
        if (newCircle) {
          this.dialogRef.close({ newCircle: newCircle });
        }
      }
    } catch (error) {
      console.error('Error creating new circle:', error);
    }
  }

  // Clear search
  clearSearch() {
    this.circleSearchTerm = '';
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }
}
