import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core'
import { Subject } from 'rxjs'
import { debounceTime, takeUntil } from 'rxjs/operators'
import { remult } from 'remult'
import { Donor, Donation, Place } from '../../../../../shared/entity'
import { DonorController } from '../../../../../shared/controllers/donor.controller'
import { DonorMapController } from '../../../../../shared/controllers/donor-map.controller'

@Component({
  selector: 'app-donor-select-step',
  templateUrl: './donor-select-step.component.html',
  styleUrls: ['./donor-select-step.component.scss']
})
export class DonorSelectStepComponent implements OnInit, OnDestroy {
  @Output() donorSelected = new EventEmitter<Donor>()
  @Output() viewDonorDetails = new EventEmitter<Donor>()

  searchTerm = ''
  loading = true
  searching = false

  filteredDonors: Donor[] = []
  recentDonors: Donor[] = []
  donorPhoneMap: Record<string, string> = {}
  donorPlaceMap: Record<string, Place> = {}

  private searchSubject = new Subject<void>()
  private destroy$ = new Subject<void>()

  async ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(250),
      takeUntil(this.destroy$)
    ).subscribe(() => this.filterDonors())

    await this.loadData()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private async loadData() {
    this.loading = true
    try {
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

    if (recentDonorIds.length === 0) return

    const [donors, exportData] = await Promise.all([
      remult.repo(Donor).find({ where: { id: { $in: recentDonorIds } } }),
      DonorMapController.loadDonorsForExport(recentDonorIds)
    ])

    for (const d of exportData) {
      if (d.phone) this.donorPhoneMap[d.id] = d.phone
      if (d.place?.city) {
        this.donorPlaceMap[d.id] = { city: d.place.city, fullAddress: d.fullAddress } as any as Place
      }
    }

    this.recentDonors = recentDonorIds
      .map(id => donors.find(d => d.id === id))
      .filter((d): d is Donor => !!d)
  }

  onSearchChange() {
    this.searchSubject.next()
  }

  private async filterDonors() {
    const term = this.searchTerm.trim()
    if (!term) {
      this.filteredDonors = []
      return
    }

    this.searching = true
    try {
      const data = await DonorController.getDonorsForSelectionPage({
        search: term,
        page: 1,
        pageSize: 20
      })

      this.filteredDonors = data.donors

      for (const [id, phone] of Object.entries(data.donorPhoneMap)) {
        this.donorPhoneMap[id] = phone
      }
      for (const [id, place] of Object.entries(data.donorPlaceMap)) {
        this.donorPlaceMap[id] = place
      }
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
