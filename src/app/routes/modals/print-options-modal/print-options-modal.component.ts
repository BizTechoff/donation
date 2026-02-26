import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';

export type PrintType = 'table' | 'donations' | 'labels' | 'envelopes';
export type TagPosition = 'none' | 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';

export interface DonationPrintOptions {
  printDetails: boolean;
  printScans: boolean;
  tagPosition: TagPosition;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '400px',
  width: '90vw'
})
@Component({
  selector: 'app-print-options-modal',
  templateUrl: './print-options-modal.component.html',
  styleUrls: ['./print-options-modal.component.scss']
})
export class PrintOptionsModalComponent {
  args!: {
    onPrint: (printType: PrintType, donationOptions?: DonationPrintOptions) => void;
    scansCount?: number;
    totalCount?: number;
  };

  printType: PrintType = 'table';
  printDetails = true;
  printScans = true;
  tagPosition: TagPosition = 'top-right';

  tagPositions: { value: TagPosition; label: string; icon: string }[] = [
    { value: 'top-right', label: 'למעלה ימין', icon: '↗' },
    { value: 'top-center', label: 'למעלה אמצע', icon: '↑' },
    { value: 'top-left', label: 'למעלה שמאל', icon: '↖' },
    { value: 'bottom-right', label: 'למטה ימין', icon: '↘' },
    { value: 'bottom-center', label: 'למטה אמצע', icon: '↓' },
    { value: 'bottom-left', label: 'למטה שמאל', icon: '↙' },
  ];

  constructor(private dialogRef: MatDialogRef<any>) {}

  close() {
    this.dialogRef.close();
  }

  onPrintClick() {
    if (this.printType === 'donations') {
      this.args.onPrint(this.printType, {
        printDetails: this.printDetails,
        printScans: this.printScans,
        tagPosition: this.tagPosition
      });
    } else {
      this.args.onPrint(this.printType);
    }
    this.dialogRef.close();
  }
}
