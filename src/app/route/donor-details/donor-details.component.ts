import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';
import { Donor, Donation } from '../../../shared/entity';

@Component({
  selector: 'app-donor-details',
  templateUrl: './donor-details.component.html',
  styleUrls: ['./donor-details.component.scss']
})
export class DonorDetailsComponent implements OnInit {

  donor?: Donor;
  donations: Donation[] = [];
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);
  loading = false;
  isNewDonor = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new') {
      this.isNewDonor = true;
      this.donor = this.donorRepo.create();
    } else if (id) {
      await this.loadDonor(id);
    }
  }

  async loadDonor(id: string) {
    this.loading = true;
    try {
      const donor = await this.donorRepo.findId(id);
      this.donor = donor || undefined;
      if (this.donor) {
        await this.loadDonations();
      }
    } catch (error) {
      console.error('Error loading donor:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonations() {
    if (!this.donor) return;
    
    try {
      this.donations = await this.donationRepo.find({
        where: { donorId: this.donor.id },
        orderBy: { donationDate: 'desc' }
      });
    } catch (error) {
      console.error('Error loading donations:', error);
    }
  }

  async saveDonor() {
    if (!this.donor) return;

    try {
      await this.donor.save();
      if (this.isNewDonor) {
        this.router.navigate(['/donor-details', this.donor.id]);
      }
    } catch (error) {
      console.error('Error saving donor:', error);
    }
  }

  async deleteDonor() {
    if (!this.donor) return;

    if (confirm(`האם אתה בטוח שברצונך למחוק את ${this.donor.fullName}?`)) {
      try {
        await this.donor.delete();
        this.router.navigate(['/donor-list']);
      } catch (error) {
        console.error('Error deleting donor:', error);
      }
    }
  }

  async deactivateDonor() {
    if (!this.donor) return;

    try {
      await this.donor.deactivate();
      await this.loadDonor(this.donor.id);
    } catch (error) {
      console.error('Error deactivating donor:', error);
    }
  }

  async activateDonor() {
    if (!this.donor) return;

    try {
      await this.donor.activate();
      await this.loadDonor(this.donor.id);
    } catch (error) {
      console.error('Error activating donor:', error);
    }
  }

  get totalDonations(): number {
    return this.donations.reduce((sum, donation) => sum + donation.amount, 0);
  }

  get donationCount(): number {
    return this.donations.length;
  }

  get lastDonationDate(): Date | undefined {
    return this.donations.length > 0 ? this.donations[0].donationDate : undefined;
  }

  goBack() {
    this.router.navigate(['/donor-list']);
  }
}