import { Component, OnInit } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { remult } from 'remult'
import { Donor, Donation, Campaign, DonationMethod } from '../../../shared/entity'
import { PayerService } from '../../services/payer.service'
import { UIToolsService } from '../../common/UIToolsService'
import { terms } from '../../terms'
import { CurrencyType } from '../../../shared/type/currency.type'

@Component({
  selector: 'app-quick-donation',
  templateUrl: './quick-donation.component.html',
  styleUrls: ['./quick-donation.component.scss']
})
export class QuickDonationComponent implements OnInit {
  currentStep = 1
  totalSteps = 4

  // Reference data
  donationMethods: DonationMethod[] = []
  campaigns: Campaign[] = []
  currencies: Record<string, CurrencyType> = {}

  // Wizard state
  selectedDonor: Donor | null = null
  savedDonation: Donation | null = null

  // Donor details side-view (not part of wizard steps)
  showingDonorDetails = false

  // Navigation source tracking
  private sourceIsMap = false
  private sourceDonorId: string | null = null

  stepLabels = ['בחר תורם', 'הזן תרומה', 'צלם צ\'ק', 'סיום']

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private payerService: PayerService,
    private ui: UIToolsService
  ) { }

  async ngOnInit() {
    this.currencies = this.payerService.getCurrencyTypesRecord()

    const [methods, campaigns] = await Promise.all([
      remult.repo(DonationMethod).find({ where: { isActive: true } }),
      remult.repo(Campaign).find({ orderBy: { name: 'asc' } })
    ])
    this.donationMethods = methods
    this.campaigns = campaigns

    // Handle query params (from route planner or other sources)
    const donorId = this.route.snapshot.queryParamMap.get('donorId')
    const mode = this.route.snapshot.queryParamMap.get('mode')
    const source = this.route.snapshot.queryParamMap.get('source')

    // Track navigation source for smart back navigation
    if (source === 'map' && donorId) {
      this.sourceIsMap = true
      this.sourceDonorId = donorId
    }

    if (donorId) {
      try {
        const donor = await remult.repo(Donor).findId(donorId)
        if (donor) {
          this.selectedDonor = donor
          if (mode === 'details') {
            this.showingDonorDetails = true
          } else {
            this.currentStep = 2
          }
        }
      } catch (err) {
        console.error('Failed to load donor from query param:', err)
      }
    }
  }

  onDonorSelected(donor: Donor) {
    this.selectedDonor = donor
    this.showingDonorDetails = false
    this.currentStep = 2
  }

  onViewDonorDetails(donor: Donor) {
    this.selectedDonor = donor
    this.showingDonorDetails = true
  }

  onBackFromDetails() {
    // If came from map, navigate back to map with popup
    if (this.sourceIsMap && this.sourceDonorId) {
      this.router.navigate(['/m/route-planner'], {
        queryParams: { openPopup: this.sourceDonorId }
      })
      return
    }
    this.showingDonorDetails = false
    this.selectedDonor = null
  }

  onNewDonationFromDetails(donor: Donor) {
    this.selectedDonor = donor
    this.showingDonorDetails = false
    this.currentStep = 2
  }

  onDonationSaved(donation: Donation) {
    this.savedDonation = donation
    this.currentStep = 3
  }

  onPhotoComplete() {
    this.currentStep = 4
  }

  onPhotoSkipped() {
    this.currentStep = 4
  }

  goBack() {
    // If showing donor details and came from map, go back to map
    if (this.showingDonorDetails && this.sourceIsMap && this.sourceDonorId) {
      this.router.navigate(['/m/route-planner'], {
        queryParams: { openPopup: this.sourceDonorId }
      })
      return
    }

    if (this.currentStep > 1) {
      // If at step 2 (donation form) and came from map, go back to map
      if (this.currentStep === 2 && this.sourceIsMap && this.sourceDonorId) {
        this.router.navigate(['/m/route-planner'], {
          queryParams: { openPopup: this.sourceDonorId }
        })
        return
      }
      this.currentStep--
    }
  }

  resetWizard() {
    this.selectedDonor = null
    this.savedDonation = null
    this.showingDonorDetails = false
    this.currentStep = 1
  }

  finish() {
    this.ui.info(terms.donationSavedSuccess)
    this.resetWizard()
  }
}
