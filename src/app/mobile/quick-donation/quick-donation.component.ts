import { Component, OnDestroy, OnInit } from '@angular/core'
import { Location } from '@angular/common'
import { Router, ActivatedRoute, ParamMap } from '@angular/router'
import { Subscription } from 'rxjs'
import { remult } from 'remult'
import { Donor, Donation, Campaign, DonationMethod } from '../../../shared/entity'
import { PayerService } from '../../services/payer.service'
import { UIToolsService } from '../../common/UIToolsService'
import { terms } from '../../terms'
import { CurrencyType } from '../../../shared/type/currency.type'

// Wizard state lives in the URL, so every screen is its own history entry and
// the phone's Back button walks back through the screens instead of leaving the
// app (מובייל - Back בתוך האפליקציה).
//   (no step)                 -> 1 בחר תורם
//   mode=details&donorId      -> פרטי תורם
//   step=form&donorId         -> 2 הזן תרומה
//   step=photo&donationId     -> 3 צלם צ'ק   (replaces the form entry)
//   step=done&donationId      -> 4 סיום      (replaces the photo entry)
//   mode=details&tab=X         -> לשונית בפרטי התורם (replaces, no new entry)
//   mode=donations&donorId     -> תרומות התורם (מסך משלו - כפתור "תרומות" בשורת התורם)
//   mode=new-donor[&placeId]   -> תורם חדש (כפתור "+" או נקודה במפה); אחרי שמירה מוחלף
//   step=edit&donationId      -> עריכת תרומה קיימת באותו טופס; שמירה חוזרת לרשימה
// After a save the form entry is replaced, so Back can never reopen a form that
// was already saved (no duplicate donations).
type WizardStep = 'form' | 'edit' | 'photo' | 'done'
const STEP_NUMBER: Record<WizardStep, number> = { form: 2, edit: 2, photo: 3, done: 4 }

@Component({
  selector: 'app-quick-donation',
  templateUrl: './quick-donation.component.html',
  styleUrls: ['./quick-donation.component.scss']
})
export class QuickDonationComponent implements OnInit, OnDestroy {
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
  detailsTab = ''
  // מסכים צדדיים נוספים מחוץ לשלבי האשף
  showingDonations = false
  showingNewDonor = false
  newDonorPlaceId = ''
  private newDonorFromMap = false

  // עריכת תרומה קיימת (step=edit) - אותו טופס של תרומה חדשה
  editingDonation: Donation | null = null

  // Navigation source tracking
  private sourceIsMap = false
  private sourceDonorId: string | null = null

  // true once this screen pushed a history entry of its own - only then can
  // the in-app "חזור" safely use history back (otherwise it could leave the app)
  private pushedInApp = false
  private paramsSub?: Subscription

  stepLabels = ['בחר תורם', 'הזן תרומה', 'צלם צ\'ק', 'סיום']

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
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

    // Query params (from route planner, Back/Forward, refresh) drive the screen
    this.paramsSub = this.route.queryParamMap.subscribe(params => this.applyParams(params))
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe()
  }

  private async applyParams(params: ParamMap) {
    const donorId = params.get('donorId')
    const donationId = params.get('donationId')
    const mode = params.get('mode')
    const step = params.get('step') as WizardStep | null
    const source = params.get('source')

    // Track navigation source for smart back navigation
    this.sourceIsMap = source === 'map' && !!donorId
    this.showingDonations = false
    this.showingNewDonor = false
    this.sourceDonorId = this.sourceIsMap ? donorId : null

    try {
      if (donorId && this.selectedDonor?.id !== donorId) {
        this.selectedDonor = (await remult.repo(Donor).findId(donorId)) ?? null
      }
      if (donationId && step === 'edit') {
        if (this.editingDonation?.id !== donationId) {
          this.editingDonation = (await remult.repo(Donation).findId(donationId)) ?? null
        }
      } else if (donationId && this.savedDonation?.id !== donationId) {
        this.savedDonation = (await remult.repo(Donation).findId(donationId)) ?? null
      }
    } catch (err) {
      console.error('Failed to load wizard state from query params:', err)
    }

    this.detailsTab = params.get('tab') || ''
    if (step !== 'edit') this.editingDonation = null

    if (mode === 'new-donor') {
      this.showingDonorDetails = false
      this.showingNewDonor = true
      this.newDonorPlaceId = params.get('placeId') || ''
      this.newDonorFromMap = source === 'map'
      this.currentStep = 1
      return
    }
    if (mode === 'donations' && this.selectedDonor) {
      this.showingDonorDetails = false
      this.showingDonations = true
      this.currentStep = 1
      return
    }
    if (mode === 'details' && this.selectedDonor) {
      this.showingDonorDetails = true
      this.currentStep = 1
      return
    }
    this.showingDonorDetails = false

    if (step === 'form' && this.selectedDonor) {
      this.currentStep = 2
    } else if (step === 'edit' && this.selectedDonor && this.editingDonation) {
      this.currentStep = 2
    } else if ((step === 'photo' || step === 'done') && this.selectedDonor && this.savedDonation) {
      this.currentStep = STEP_NUMBER[step]
    } else if (!step && this.selectedDonor && donorId && !mode) {
      // legacy link with donorId only (route planner) -> donation form
      this.currentStep = 2
    } else {
      this.currentStep = 1
      if (!donorId) {
        this.selectedDonor = null
        this.savedDonation = null
      }
    }
  }

  /** Move to a wizard screen. push = new history entry; otherwise replace the current one. */
  private go(params: Record<string, string>, push: boolean) {
    if (this.sourceIsMap && this.sourceDonorId && !params['source']) {
      params = { ...params, source: 'map' }
    }
    if (push) this.pushedInApp = true
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: !push
    })
  }

  private backToMap() {
    this.router.navigate(['/m/route-planner'], {
      queryParams: { openPopup: this.sourceDonorId },
      replaceUrl: true
    })
  }

  /** In-app "חזור" - same as the phone's Back when we own the previous entry. */
  private historyBack(fallback: Record<string, string>) {
    if (this.pushedInApp) {
      this.location.back()
    } else {
      this.go(fallback, false)
    }
  }

  onDonorSelected(donor: Donor) {
    this.selectedDonor = donor
    this.go({ donorId: donor.id, step: 'form' }, true)
  }

  onViewDonorDetails(donor: Donor) {
    this.selectedDonor = donor
    this.go({ donorId: donor.id, mode: 'details' }, true)
  }

  onBackFromDetails() {
    // If came from map, navigate back to map with popup
    if (this.sourceIsMap && this.sourceDonorId) {
      this.backToMap()
      return
    }
    this.historyBack({})
  }

  /** לשונית בפרטי התורם - מחליפה את הרשומה (לשוניות לא נערמות בהיסטוריה) */
  onDetailsSection(tab: string) {
    this.go({ donorId: this.selectedDonor!.id, mode: 'details', tab }, false)
  }

  /** "תרומות" בשורת התורם - רשימת התרומות שלו */
  onViewDonations(donor: Donor) {
    this.selectedDonor = donor
    this.go({ donorId: donor.id, mode: 'donations' }, true)
  }

  /** "+" ליד החיפוש - תורם חדש בלי כתובת */
  onAddDonor() {
    this.go({ mode: 'new-donor' }, true)
  }

  /**
   * תורם חדש נשמר - מיד שואלים אם להוסיף לו תרומה (יעקב). המסך של התורם החדש
   * מוחלף, כך ש-Back לא פותח שוב טופס של תורם שכבר נשמר.
   */
  async onNewDonorSaved(donor: Donor) {
    this.selectedDonor = donor
    const addDonation = await this.ui.yesNoQuestion('התורם נשמר. להוסיף לו תרומה עכשיו?', true)
    this.go(addDonation
      ? { donorId: donor.id, step: 'form' }
      : { donorId: donor.id, mode: 'details' }, false)
  }

  /** ביטול תורם חדש - חזרה למסך הקודם (חיפוש או המפה) */
  historyBackToSearch() {
    if (this.newDonorFromMap) {
      this.location.back() // המפה פתחה את המסך הזה - חוזרים אליה
      return
    }
    this.historyBack({})
  }

  onEditDonation(donation: Donation) {
    this.editingDonation = donation
    this.go({ donorId: this.selectedDonor!.id, donationId: donation.id, step: 'edit' }, true)
  }

  /** אחרי עדכון - חזרה לרשימת התרומות של התורם */
  onDonationUpdated() {
    this.ui.info('התרומה עודכנה')
    this.editingDonation = null
    this.historyBack({ donorId: this.selectedDonor!.id, mode: 'donations' })
  }

  onNewDonationFromDetails(donor: Donor) {
    this.selectedDonor = donor
    this.go({ donorId: donor.id, step: 'form' }, true)
  }

  onDonationSaved(donation: Donation) {
    this.savedDonation = donation
    // replace the form entry - Back must not return to an already-saved form
    this.go({ donorId: this.selectedDonor!.id, donationId: donation.id, step: 'photo' }, false)
  }

  onPhotoComplete() {
    this.toDone()
  }

  onPhotoSkipped() {
    this.toDone()
  }

  private toDone() {
    this.go({ donorId: this.selectedDonor!.id, donationId: this.savedDonation!.id, step: 'done' }, false)
  }

  goBack() {
    if (this.editingDonation) {
      // עריכה -> רשימת התרומות של התורם (גם כשהגיעו לתורם מהמפה)
      this.historyBack({ donorId: this.selectedDonor!.id, mode: 'donations' })
      return
    }
    // If at donation form / after save and came from map, go back to map
    if (this.currentStep >= 2 && this.sourceIsMap && this.sourceDonorId) {
      this.backToMap()
      return
    }
    if (this.currentStep > 1) {
      // form -> the screen before it; photo -> the screen before the (replaced) form
      this.historyBack({})
    }
  }

  resetWizard() {
    this.selectedDonor = null
    this.savedDonation = null
    this.showingDonorDetails = false
    this.sourceIsMap = false
    this.sourceDonorId = null
    // replace the "done" entry - Back from the new search does not reopen it
    this.go({}, false)
  }

  finish() {
    this.ui.info(terms.donationSavedSuccess)
    this.resetWizard()
  }
}
