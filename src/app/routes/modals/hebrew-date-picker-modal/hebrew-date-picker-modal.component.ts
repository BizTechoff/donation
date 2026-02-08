import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-hebrew-date-picker-modal',
  template: `
    <div class="hebrew-date-modal">
      <h2 mat-dialog-title>{{ title }}</h2>
      <mat-dialog-content>
        <app-dual-date-picker
          [(ngModel)]="selectedDate"
          (dateChange)="onDateChange($event)">
        </app-dual-date-picker>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">ביטול</button>
        <button mat-raised-button color="primary" (click)="confirm()">אישור</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .hebrew-date-modal {
      min-width: 400px;
      direction: rtl;
    }
    h2 {
      margin: 0;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    mat-dialog-content {
      padding: 20px 0;
    }
    mat-dialog-actions {
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
  `]
})
export class HebrewDatePickerModalComponent implements OnInit {
  title = 'בחר תאריך עברי';
  selectedDate: Date | null = null;

  constructor(private dialogRef: MatDialogRef<HebrewDatePickerModalComponent>) {}

  ngOnInit() {}

  onDateChange(date: Date | null) {
    this.selectedDate = date;
  }

  cancel() {
    this.dialogRef.close(null);
  }

  confirm() {
    this.dialogRef.close(this.selectedDate);
  }
}
