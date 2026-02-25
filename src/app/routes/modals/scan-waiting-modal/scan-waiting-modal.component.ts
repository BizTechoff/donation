import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { FileController } from '../../../../shared/controllers/file.controller';
import { DonationFile } from '../../../../shared/entity/file';

export interface ScanWaitingModalArgs {
  donationId: string;
}

@DialogConfig({
  hasBackdrop: true,
  maxWidth: '420px',
  disableClose: true
})
@Component({
  selector: 'app-scan-waiting-modal',
  templateUrl: './scan-waiting-modal.component.html',
  styleUrls: ['./scan-waiting-modal.component.scss']
})
export class ScanWaitingModalComponent implements OnInit, OnDestroy {
  args!: ScanWaitingModalArgs;
  newFiles: DonationFile[] = [];
  private pollingTimer?: ReturnType<typeof setInterval>;
  private initialFileIds = new Set<string>();

  constructor(
    public dialogRef: MatDialogRef<ScanWaitingModalComponent>
  ) { }

  async ngOnInit() {
    // Register active donation
    this.registerActive(this.args.donationId);

    // Snapshot current files
    const currentFiles = await FileController.getFilesByDonation(this.args.donationId);
    currentFiles.forEach(f => this.initialFileIds.add(f.id));

    // Start polling
    this.pollingTimer = setInterval(() => this.checkForNewFiles(), 4000);
  }

  ngOnDestroy() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
    this.registerActive(null);
  }

  private async checkForNewFiles() {
    try {
      const files = await FileController.getFilesByDonation(this.args.donationId);
      this.newFiles = files.filter(f => !this.initialFileIds.has(f.id));
    } catch (err) {
      console.error('Scan polling error:', err);
    }
  }

  close() {
    this.dialogRef.close(this.newFiles.length > 0);
  }

  private registerActive(donationId: string | null) {
    fetch('/api/scan/register-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donationId })
    }).catch(err => console.error('Failed to register active donation:', err));
  }
}
