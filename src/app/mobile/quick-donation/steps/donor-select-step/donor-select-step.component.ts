import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { remult } from 'remult'
import { Donor, Donation, Place } from '../../../../../shared/entity'
import { DonorController, DonorSelectionData } from '../../../../../shared/controllers/donor.controller'

@Component({
  selector: 'app-donor-select-step',
  templateUrl: './donor-select-step.component.html',
  styleUrls: ['./donor-select-step.component.scss']
})
export class DonorSelectStepComponent implements OnInit {
  @Output() donorSelected = new EventEmitter<Donor>()
  @Output() viewDonorDetails = new EventEmitter<Donor>()

  searchTerm = ''
  loading = true
  searching = false

  allDonors: Donor[] = []
  filteredDonors: Donor[] = []
  recentDonors: Donor[] = []
  donorPhoneMap: Record<string, string> = {}
  donorPlaceMap: Record<string, Place> = {}

  private selectionData: DonorSelectionData | null = null
  private searchTimeout: any

  async ngOnInit() {
    await this.loadData()
  }

  private async loadData() {
    this.loading = true
    try {
      this.selectionData = await DonorController.getDonorsForSelection()
      this.allDonors = this.selectionData.donors
      this.donorPhoneMap = this.selectionData.donorPhoneMap
      this.donorPlaceMap = this.selectionData.donorPlaceMap

      await this.loadRecentDonors()
    } finally {
      this.loading = false
    }
  }

  private async loadRecentDonors() {
    const recentDonations = await remult.repo(Donation).find({
      orderBy: { donationDate: 'desc' },
      limit: 20
    })

    const seen = new Set<string>()
    const recentDonorIds: string[] = []
    for (const d of recentDonations) {
      if (d.donorId && !seen.has(d.donorId)) {
        seen.add(d.donorId)
        recentDonorIds.push(d.donorId)
        if (recentDonorIds.length >= 5) break
      }
    }

    this.recentDonors = recentDonorIds
      .map(id => this.allDonors.find(d => d.id === id))
      .filter((d): d is Donor => !!d)
  }

  onSearchChange() {
    clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => this.filterDonors(), 250)
  }

  private async filterDonors() {
    const term = this.searchTerm.trim().toLowerCase()
    if (!term) {
      this.filteredDonors = []
      return
    }

    this.searching = true
    try {
      const words = term.split(/\s+/)
      this.filteredDonors = this.allDonors.filter(donor => {
        const fullName = `${donor.firstName} ${donor.lastName}`.toLowerCase()
        const phone = (this.donorPhoneMap[donor.id] || '').toLowerCase()
        const place = this.donorPlaceMap[donor.id]
        const city = (place?.city || '').toLowerCase()

        return words.every(w =>
          fullName.includes(w) || phone.includes(w) || city.includes(w)
        )
      }).slice(0, 20)
    } finally {
      this.searching = false
    }
  }

  getDonorPhone(donor: Donor): string {
    return this.donorPhoneMap[donor.id] || ''
  }

  getDonorCity(donor: Donor): string {
    return this.donorPlaceMap[donor.id]?.city || ''
  }

  getDonorFullName(donor: Donor): string {
    return `${donor.firstName} ${donor.lastName}`.trim()
  }
}
