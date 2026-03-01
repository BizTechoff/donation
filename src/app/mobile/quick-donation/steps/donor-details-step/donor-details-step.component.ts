import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { remult } from 'remult'
import { Donor, DonorContact, DonorPlace, DonorEvent, DonorNote, Circle, DonorRelation } from '../../../../../shared/entity'
import { DonorReceptionHour } from '../../../../../shared/entity/donor-reception-hour'
import { DonorController } from '../../../../../shared/controllers/donor.controller'

@Component({
  selector: 'app-donor-details-step',
  templateUrl: './donor-details-step.component.html',
  styleUrls: ['./donor-details-step.component.scss']
})
export class DonorDetailsStepComponent implements OnInit {
  @Input() donor!: Donor
  @Output() back = new EventEmitter<void>()
  @Output() newDonation = new EventEmitter<Donor>()

  loading = true
  activeSection = 'personal'

  contacts: DonorContact[] = []
  places: DonorPlace[] = []
  events: DonorEvent[] = []
  notes: DonorNote[] = []
  circles: Circle[] = []
  relations: DonorRelation[] = []
  receptionHours: DonorReceptionHour[] = []

  sections = [
    { id: 'personal', label: 'פרטים אישיים', icon: 'person' },
    { id: 'address', label: 'כתובת', icon: 'location_on' },
    { id: 'preferences', label: 'העדפות', icon: 'tune' },
    { id: 'family', label: 'משפחה', icon: 'family_restroom' },
    { id: 'events', label: 'אירועים', icon: 'event' },
    { id: 'circles', label: 'חוגים', icon: 'groups' },
    { id: 'notes', label: 'הערות', icon: 'sticky_note_2' }
  ]

  async ngOnInit() {
    await this.loadDetails()
  }

  private async loadDetails() {
    this.loading = true
    try {
      const data = await DonorController.getDonorDetailsData(this.donor.id)

      // Use fresh donor data from backend (has all fields including circleIds)
      if (data.donor) {
        this.donor = data.donor
      }

      this.contacts = data.donorContacts || []
      this.places = data.donorPlaces || []
      this.events = data.donorEvents || []
      this.notes = data.donorNotes || []
      this.relations = data.donorRelations || []
      this.receptionHours = data.donorReceptionHours || []

      // Resolve circles from donor.circleIds
      const allCircles = data.circles || []
      const circleIds = this.donor.circleIds || []
      this.circles = allCircles.filter(c => circleIds.includes(c.id))
    } finally {
      this.loading = false
    }
  }

  getDonorFullName(): string {
    return `${this.donor.firstName} ${this.donor.lastName}`.trim()
  }

  getPhones(): DonorContact[] {
    return this.contacts.filter(c => c.type === 'phone' && c.isActive)
  }

  getEmails(): DonorContact[] {
    return this.contacts.filter(c => c.type === 'email' && c.isActive)
  }

  getActivePlaces(): DonorPlace[] {
    return this.places.filter(p => p.isActive).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
  }

  getActiveEvents(): DonorEvent[] {
    return this.events.filter(e => e.isActive)
  }

  getActiveNotes(): DonorNote[] {
    return this.notes.filter(n => n.isActive)
  }

  getMaritalStatusLabel(): string {
    const map: Record<string, string> = {
      'married': 'נשוי/אה',
      'single': 'רווק/ה',
      'widowed': 'אלמן/ה',
      'divorced': 'גרוש/ה'
    }
    return map[this.donor.maritalStatus] || ''
  }

  getPreferredContactMethods(): string[] {
    const methods: string[] = []
    if (this.donor.preferPhone) methods.push('טלפון')
    if (this.donor.preferEmail) methods.push('אימייל')
    if (this.donor.preferSMS) methods.push('SMS')
    if (this.donor.preferHomeVisit) methods.push('ביקור בית')
    if (this.donor.preferOfficeVisit) methods.push('ביקור משרד')
    return methods
  }

  getAvailableDays(): string[] {
    const days: string[] = []
    if (this.donor.sundayAvailable) days.push('א\'')
    if (this.donor.mondayAvailable) days.push('ב\'')
    if (this.donor.tuesdayAvailable) days.push('ג\'')
    if (this.donor.wednesdayAvailable) days.push('ד\'')
    if (this.donor.thursdayAvailable) days.push('ה\'')
    if (this.donor.fridayAvailable) days.push('ו\'')
    if (this.donor.saturdayAvailable) days.push('ש\'')
    return days
  }

  getRelationName(relation: DonorRelation): string {
    const other = relation.donor1Id === this.donor.id ? relation.donor2 : relation.donor1
    if (!other) return ''
    return `${other.firstName} ${other.lastName}`.trim()
  }

  getRelationType(relation: DonorRelation): string {
    const typeMap: Record<string, string> = {
      'spouse': 'בן/בת זוג',
      'parent': 'הורה',
      'child': 'ילד/ה',
      'sibling': 'אח/ות',
      'grandparent': 'סב/תא',
      'grandchild': 'נכד/ה'
    }
    return typeMap[relation.relationshipType1] || relation.relationshipType1 || ''
  }

  formatEventDate(date: Date | null | undefined): string {
    if (!date) return ''
    return new Date(date).toLocaleDateString('he-IL')
  }
}
