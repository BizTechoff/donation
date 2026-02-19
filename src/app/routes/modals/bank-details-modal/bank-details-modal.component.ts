import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { remult } from 'remult';
import { Bank, Place } from '../../../../shared/entity';
import { AddressComponents } from '../../../common/osm-address-input/osm-address-input.component';
import { UIToolsService } from '../../../common/UIToolsService';
import { I18nService } from '../../../i18n/i18n.service';
import { PayerService } from '../../../services/payer.service';

export interface BankDetailsModalArgs {
  bankId?: string; // undefined for new bank, or bank ID for edit
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-bank-details-modal',
  templateUrl: './bank-details-modal.component.html',
  styleUrls: ['./bank-details-modal.component.scss']
})
export class BankDetailsModalComponent implements OnInit {
  args!: BankDetailsModalArgs;
  changed = false;

  bank?: Bank;
  originalBankData?: string;

  bankRepo = remult.repo(Bank);
  placeRepo = remult.repo(Place);

  loading = false;
  isNew = false;

  // Currency types from service
  currencyTypes = this.payerService.getCurrencyTypesRecord();

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef,
    private payerService: PayerService,
    public dialogRef: MatDialogRef<BankDetailsModalComponent>
  ) { }

  async ngOnInit() {
    await this.initializeBank();

    // Prevent accidental close for new bank
    if (this.isNew) {
      this.dialogRef.disableClose = true;
    }
  }

  private async initializeBank() {
    this.loading = true;
    try {
      if (!this.args?.bankId) {
        // New bank
        this.isNew = true;
        this.bank = this.bankRepo.create();
        this.bank.currencyId = 'ILS';
        this.bank.isActive = true;
        this.originalBankData = JSON.stringify(this.bank);
      } else {
        // Edit existing bank
        this.isNew = false;
        this.bank = await this.bankRepo.findId(this.args.bankId, {
          useCache: false,
          include: { place: { include: { country: true } } }
        }) || undefined;

        if (this.bank) {
          this.originalBankData = JSON.stringify(this.bank);
          this.cdr.detectChanges();
        } else {
          console.error('Failed to load bank with ID:', this.args.bankId);
          this.ui.error('שגיאה בטעינת נתוני הבנק');
        }
      }
    } catch (error) {
      console.error('Error initializing bank:', error);
      this.ui.error('שגיאה בטעינת נתוני הבנק');
    } finally {
      this.loading = false;
    }
  }

  private hasChanges(): boolean {
    if (!this.bank || !this.originalBankData) return false;
    return JSON.stringify(this.bank) !== this.originalBankData;
  }

  async save() {
    if (!this.bank) return;

    // Validate required fields
    if (!this.bank.name?.trim()) {
      this.ui.error('שם הבנק הוא שדה חובה');
      return;
    }

    try {
      this.loading = true;
      await remult.repo(Bank).save(this.bank);

      this.ui.info(this.isNew ? 'הבנק נוסף בהצלחה' : 'הבנק עודכן בהצלחה');

      this.changed = true;
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving bank:', error);
      this.ui.error('שגיאה בשמירת הבנק');
    } finally {
      this.loading = false;
    }
  }

  closeModal(event?: MouseEvent) {
    // If clicking on overlay, close modal
    if (event && event.target === event.currentTarget) {
      if (this.hasChanges()) {
        if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
          return;
        }
      }
      this.dialogRef.close(this.changed);
    } else if (!event) {
      // Direct close button click
      if (this.hasChanges()) {
        if (!confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
          return;
        }
      }
      this.dialogRef.close(this.changed);
    }
  }

  onFieldChange() {
    this.changed = true;
  }

  getAddressComponents(): AddressComponents | undefined {
    if (!this.bank?.place) return undefined;
    const place = this.bank.place;

    return {
      fullAddress: typeof place.getDisplayAddress === 'function' ? place.getDisplayAddress() : place.fullAddress || '',
      street: this.bank.place.street || '',
      houseNumber: this.bank.place.houseNumber || '',
      city: this.bank.place.city || '',
      state: this.bank.place.state || '',
      country: this.bank.place.country,
      countryCode: this.bank.place.country?.code || '',
      postcode: this.bank.place.postcode || '',
      neighborhood: this.bank.place.neighborhood || ''
    };
  }

  async onPlaceSelected(place: Place | undefined) {
    if (!this.bank) return;

    this.bank.placeId = place?.id || '';
    this.bank.place = place;
    this.onFieldChange();

    //     try {
    //       // Check if place already exists
    //       if (this.bank.placeId && this.bank.place) {
    //         // Update existing place
    //         const place = this.bank.place;
    //         place.street = addressComponents.street || '';
    //         place.houseNumber = addressComponents.houseNumber || '';
    //         place.city = addressComponents.city || '';
    //         place.state = addressComponents.state || '';
    //         place.country = addressComponents.country || '';
    //         place.countryCode = addressComponents.countryCode || '';
    //         place.postcode = addressComponents.postcode || '';
    //         place.neighborhood = addressComponents.neighborhood || '';
    // console.log(11)
    //         await remult.repo(Place).save(place);
    //         console.log(110)
    //       } else {
    //         // Create new place
    //         const newPlace = this.placeRepo.create({
    //           street: addressComponents.street || '',
    //           houseNumber: addressComponents.houseNumber || '',
    //           city: addressComponents.city || '',
    //           state: addressComponents.state || '',
    //           country: addressComponents.country || '',
    //           countryCode: addressComponents.countryCode || '',
    //           postcode: addressComponents.postcode || '',
    //           neighborhood: addressComponents.neighborhood || ''
    //         });
    // console.log(22)
    //         const savedPlace = await remult.repo(Place).save(newPlace);
    // console.log(220)
    //         this.bank.placeId = savedPlace.id;
    //         this.bank.place = savedPlace;
    //       }

    //       this.onFieldChange();
    //     } catch (error) {
    //       console.error('Error saving address:', error);
    //       this.ui.error('שגיאה בשמירת הכתובת');
    //     }
  }

  async onAddressSelected(addressComponents: AddressComponents) {
    if (!this.bank) return;

    try {
      // Check if place already exists
      if (this.bank.placeId && this.bank.place) {
        // Update existing place
        const place = this.bank.place;
        place.street = addressComponents.street || '';
        place.houseNumber = addressComponents.houseNumber || '';
        place.city = addressComponents.city || '';
        place.state = addressComponents.state || '';
        place.country = addressComponents.country;
        place.postcode = addressComponents.postcode || '';
        place.neighborhood = addressComponents.neighborhood || '';
        console.log(11)
        await remult.repo(Place).save(place);
        console.log(110)
      } else {
        // Create new place
        const newPlace = this.placeRepo.create({
          street: addressComponents.street || '',
          houseNumber: addressComponents.houseNumber || '',
          city: addressComponents.city || '',
          state: addressComponents.state || '',
          country: addressComponents.country,
          postcode: addressComponents.postcode || '',
          neighborhood: addressComponents.neighborhood || ''
        });
        console.log(22)
        const savedPlace = await remult.repo(Place).save(newPlace);
        console.log(220)
        this.bank.placeId = savedPlace.id;
        this.bank.place = savedPlace;
      }

      this.onFieldChange();
    } catch (error) {
      console.error('Error saving address:', error);
      this.ui.error('שגיאה בשמירת הכתובת');
    }
  }

}
