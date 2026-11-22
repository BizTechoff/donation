import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { remult } from 'remult'
import { Donor } from '../../../../../shared/entity'
import { Place } from '../../../../../shared/entity/place'
import { PhoneType } from '../../../../../shared/enum/phone-type'
import { ANONYMOUS_LAST_NAME, createDonorBasic } from '../../../../../shared/utils/donor-create'

/**
 * תורם חדש במובייל - טופס קצר: שם, טלפון, וכתובת כשמגיעים מנקודה במפה.
 * שם משפחה ריק נשמר כ"אלמוני" (shared/utils/donor-create). פרטים נוספים -
 * בכרטיס התורם במחשב.
 */
@Component({
  selector: 'app-donor-new-step',
  templateUrl: './donor-new-step.component.html',
  styleUrls: ['./donor-new-step.component.scss']
})
export class DonorNewStepComponent implements OnInit {
  /** כתובת שכבר נשמרה מנקודה במפה - ממלאת את שדה הכתובת, וניתנת לשינוי
   *  (קשה לקלוע בדיוק לבית הנכון במפה). ריק כשנכנסים מכפתור "+" */
  @Input() placeId = ''
  @Output() saved = new EventEmitter<Donor>()
  @Output() cancel = new EventEmitter<void>()

  readonly anonymous = ANONYMOUS_LAST_NAME
  firstName = ''
  lastName = ''
  phoneNumber = ''
  private phoneDescription = ''
  /** הכתובת בשדה הכתובת - מהמפה, או שנבחרה ידנית; השדה שומר אותה במסד בעצמו */
  place?: Place
  saving = false
  errorMessage = ''

  async ngOnInit() {
    if (this.placeId) {
      this.place = (await remult.repo(Place).findId(this.placeId, { include: { country: true } })) ?? undefined
    }
  }

  onLineType(lineType: 'mobile' | 'landline' | 'unknown') {
    if (lineType === 'unknown') return
    this.phoneDescription = (lineType === 'mobile' ? PhoneType.mobile : PhoneType.phone).id
  }

  async save() {
    if (this.saving) return
    this.saving = true
    this.errorMessage = ''
    try {
      const donor = await createDonorBasic({
        firstName: this.firstName,
        lastName: this.lastName,
        phoneNumber: this.phoneNumber,
        phoneDescription: this.phoneDescription,
        placeId: this.place?.id || undefined
      })
      this.saved.emit(donor)
    } catch (err: any) {
      this.errorMessage = err?.message || 'שגיאה בשמירת התורם'
    } finally {
      this.saving = false
    }
  }
}
