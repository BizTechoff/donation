import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { remult } from 'remult';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Country } from '../../../shared/entity/country';
import { Place } from '../../../shared/entity/place';
import { GeoService } from '../../services/geo.service';

export interface AddressComponents {
  fullAddress: string;
  placeId?: string;
  placeRecordId?: string; // ID של הרשומה בטבלת Places
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: Country;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  placeName?: string;
}

@Component({
  selector: 'app-osm-address-input',
  templateUrl: './osm-address-input.component.html',
  styleUrls: ['./osm-address-input.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OsmAddressInputComponent),
      multi: true
    }
  ]
})
export class OsmAddressInputComponent implements ControlValueAccessor, OnDestroy, OnChanges {
  @Input() label: string = 'כתובת';
  @Input() placeholder: string = 'הקלד כתובת...';
  @Input() countryCode: string = 'il';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() initialAddress?: AddressComponents;

  @Output() addressSelected = new EventEmitter<AddressComponents>();
  @Output() placeSelected = new EventEmitter<Place>();

  searchValue: string = '';
  suggestions: any[] = [];
  isLoading = false;
  selectedPlaceId: string | null = null;
  hasSelectedAddress = false;
  showAddressDetails = false;
  countries: Country[] = [];
  addressDetails: AddressComponents = {
    fullAddress: '',
    placeId: '',
    street: '',
    houseNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    postcode: '',
    country: undefined,
    countryCode: '',
    placeName: ''
  };

  private searchSubject = new Subject<string>();
  private onChange = (value: string) => { };
  private onTouched = () => { };
  private justCleared = false; // דגל למניעת טעינה חוזרת מיד אחרי ניקוי

  constructor(private geoService: GeoService) {
    // Load countries from database
    this.loadCountries();

    // הגדרת debounce לחיפוש
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(async query => {
      if (query.length < 3) {
        this.suggestions = [];
        this.isLoading = false;
        return;
      }
      this.isLoading = true;
      try {
        const predictions = await this.geoService.getCombinedSuggestions(query);
        this.suggestions = predictions;
      } catch (error) {
        console.error('Error getting suggestions:', error);
        this.suggestions = [];
      } finally {
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  async loadCountries() {
    try {
      this.countries = await remult.repo(Country).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      console.log(`Loaded ${this.countries.length} countries for address input`);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialAddress']) {
      console.log('ngOnChanges - initialAddress changed:', {
        currentValue: changes['initialAddress'].currentValue,
        previousValue: changes['initialAddress'].previousValue,
        justCleared: this.justCleared
      });
      console.log('1-11')
      // אם זה עתה ניקינו את הכתובת, נתעלם מהשינוי הזה
      if (this.justCleared) {
        console.log('ngOnChanges - ignoring change because address was just cleared');
        this.justCleared = false;
        return;
      }
      console.log('1-11-0')
      if (changes['initialAddress'].currentValue) {
        console.log('1-11-1')
        this.loadInitialAddress(changes['initialAddress'].currentValue);
      } else {
        console.log('1-11-2')
        // Clear address if initialAddress becomes undefined/null
        this.clearAddress();
      }
    }
  }

  clearAddress(emit = false): void {
    console.log('clearAddress() called - before clear:', this.addressDetails);

    // סימון שהכתובת נוקתה - למנוע טעינה חוזרת מיד אחרי
    this.justCleared = true;

    // Clear all address details
    this.addressDetails = {
      fullAddress: '',
      placeId: '',
      placeRecordId: '',
      street: '',
      houseNumber: '',
      neighborhood: '',
      city: '',
      state: '',
      postcode: '',
      country: undefined,
      countryCode: '',
      latitude: undefined,
      longitude: undefined,
      placeName: ''
    };

    this.searchValue = '';
    this.hasSelectedAddress = false;
    this.selectedPlaceId = null;
    this.showAddressDetails = false;

    console.log('Address cleared - after clear:', this.addressDetails);

    // שליחת איוונט להורה שהכתובת נוקתה
    // if (emit) {
      // this.addressSelected.emit(this.addressDetails);
      this.placeSelected.emit(undefined);
    // }
    this.onChange('');

    console.log('clearAddress() completed - emit sent to parent');
  }

  private loadInitialAddress(address: AddressComponents): void {
    this.addressDetails = { ...address };
    this.searchValue = address.fullAddress || '';
    this.hasSelectedAddress = true;
    this.selectedPlaceId = address.placeId || null;

    console.log('Loaded initial address:', address);
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.searchValue = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: any): void {
    const value = event.target.value;
    console.log('onInput() called with value:', value);
    this.searchValue = value;
    this.onChange(value);

    if (value.length >= 3) {
      this.searchSubject.next(value);
    } else {
      this.suggestions = [];
    }
  }

  onFocus(): void {
    console.log('onFocus() called, current searchValue:', this.searchValue);
    this.onTouched();
  }

  async onSuggestionSelect(suggestion: any): Promise<void> {
    console.log('Step 1: User selected suggestion:', suggestion);

    this.selectedPlaceId = suggestion.place_id;
    this.searchValue = suggestion.description;
    this.onChange(this.searchValue);
    this.suggestions = [];

    // בדיקה אם זה מקום שמור או מקום חדש מגוגל
    if (suggestion.isFromDatabase && suggestion.savedPlace) {
      console.log('Step 2: Using saved place from database:', suggestion.savedPlace);

      // שימוש במקום השמור
      // const savedPlace = suggestion.savedPlace;
      // const addressComponents: AddressComponents = {
      //   fullAddress: savedPlace.fullAddress,
      //   placeId: savedPlace.placeId,
      //   placeRecordId: savedPlace.id,
      //   latitude: savedPlace.latitude,
      //   longitude: savedPlace.longitude,
      //   street: savedPlace.street,
      //   houseNumber: savedPlace.houseNumber,
      //   neighborhood: savedPlace.neighborhood,
      //   city: savedPlace.city,
      //   state: savedPlace.state,
      //   postcode: savedPlace.postcode,
      //   country: savedPlace.country,
      //   countryCode: savedPlace.countryCode,
      //   placeName: savedPlace.placeName
      // };

      // this.addressDetails = { ...addressComponents };
      // this.hasSelectedAddress = true;
      // this.showAddressDetails = false;

      console.log('Step 3: Using existing place record, no API call needed');
      // this.addressSelected.emit(addressComponents);
      this.placeSelected.emit(suggestion.savedPlace)
      return;
    }

    // Step 2: קבלת פרטים מלאים על המקום באמצעות place_id (רק למקומות חדשים מגוגל)
    try {
      console.log('Step 2: Getting place details from Google for new place');
      const placeDetails = await this.geoService.getPlaceDetails(suggestion.place_id);
      console.log('Step 2: Received full place details from Google:', placeDetails);

      // בדיקה מפורטת של המבנה שחוזר מהשרת
      console.log('Server Response Structure:', {
        hasData: !!placeDetails,
        isValid: placeDetails.valid,
        hasCoordinates: !!(placeDetails.x && placeDetails.y),
        streetname: placeDetails.streetname,
        homenumber: placeDetails.homenumber,
        cityname: placeDetails.cityname,
        name: placeDetails.name
      });

      // Step 3: המרת הפרטים מהשרת לפורמט AddressComponents
      const countryCode = placeDetails.countryCode || 'IL';

      // Step 3.1: טעינת ישות Country מהמסד נתונים לפי קוד מדינה
      let countryEntity: Country | undefined;
      try {
        countryEntity = await remult.repo(Country).findFirst({
          code: countryCode
        });

        if (!countryEntity) {
          console.warn(`Country with code ${countryCode} not found in database, creating new country...`);

          // יצירת מדינה חדשה מהנתונים שמגיעים מגוגל
          const countryName = placeDetails.country || countryCode;
          countryEntity = await remult.repo(Country).insert({
            name: countryName,
            nameEn: countryName,
            code: countryCode.toUpperCase(),
            phonePrefix: '', // יש למלא ידנית
            currency: 'USD', // ברירת מחדל - יש למלא ידנית
            currencySymbol: '$', // ברירת מחדל - יש למלא ידנית
            isActive: true
          });

          console.log(`✓ New country created: ${countryEntity.name} (${countryEntity.code})`);
          console.log('⚠ Please update country details manually: phonePrefix, currency, currencySymbol');
        }
      } catch (error) {
        console.error('Error loading/creating country entity:', error);
      }

      const addressComponents: AddressComponents = {
        fullAddress: suggestion.description,
        placeId: suggestion.place_id,  // שמירת ה-place_id למזהה חד-ערכי
        latitude: placeDetails.y,  // y = latitude
        longitude: placeDetails.x, // x = longitude
        street: placeDetails.streetname || '',
        houseNumber: placeDetails.homenumber || '',
        city: placeDetails.cityname || '',
        state: placeDetails.state || '',  // מחוז מהשרת
        country: countryEntity,  // ישות Country מהמסד נתונים
        countryCode: countryCode, // קוד מדינה מהשרת או ברירת מחדל
        neighborhood: placeDetails.neighborhood || '',  // שכונה מהשרת
        postcode: placeDetails.postcode || ''  // מיקוד מהשרת
      };

      // בדיקה אם יש נתונים חוזרים מהשרת
      if (!placeDetails.valid) {
        console.warn('Server returned invalid place data!');
      }

      // Step 4: וידוא שכל השדות הנדרשים קיימים
      console.log('Step 3: Required fields extracted:', {
        placeId: addressComponents.placeId,  // מזהה חד-ערכי של Google
        street: addressComponents.street || 'חסר',
        houseNumber: addressComponents.houseNumber || 'חסר',
        city: addressComponents.city || 'חסר',
        state: addressComponents.state || 'חסר',
        country: addressComponents.country || 'חסר',
        neighborhood: addressComponents.neighborhood || 'חסר',
        postcode: addressComponents.postcode || 'חסר'
      });

      console.log('Step 4: Final parsed address components:', addressComponents);

      // Step 5: שמירת המקום ב-Places טבלה מיד ברגע הבחירה
      var savedPlace = undefined
      try {
        const placeData = {
          placeId: String(addressComponents.placeId || ''),
          fullAddress: String(addressComponents.fullAddress || ''),
          placeName: placeDetails.name || '',
          street: addressComponents.street,
          houseNumber: addressComponents.houseNumber,
          neighborhood: addressComponents.neighborhood,
          city: String(addressComponents.city || ''),
          state: addressComponents.state,
          postcode: addressComponents.postcode,
          countryId: addressComponents.country?.id,
          country: addressComponents.country,
          countryCode: addressComponents.countryCode,
          latitude: addressComponents.latitude,
          longitude: addressComponents.longitude
        };

        console.log('Creating/updating Place record immediately upon selection:', placeData);
        console.log('PlaceId type and value:', typeof placeData.placeId, placeData.placeId);
        console.log('Required fields check:', {
          placeId: placeData.placeId,
          fullAddress: placeData.fullAddress,
          city: placeData.city,
          countryId: placeData.countryId,
          countryCode: placeData.countryCode
        });
        savedPlace = await Place.findOrCreate(placeData, remult.repo(Place));
        console.log('Place saved successfully with ID:', savedPlace.id);

        // טעינה מחדש של ה-Place עם ה-country relation
        savedPlace = await remult.repo(Place).findId(savedPlace.id, {
          include: { country: true }
        }) || savedPlace;
        console.log('Place reloaded with country:', savedPlace.country);

        // הוספת ה-ID של המקום לכתובת
        addressComponents.placeRecordId = savedPlace.id;
      } catch (error) {
        console.error('Error saving place:', error);
      }

      // שמירת הפרטים למקרה של עריכה
      this.addressDetails = { ...addressComponents };
      this.addressDetails.placeName = placeDetails.name || '';
      this.hasSelectedAddress = true;
      this.showAddressDetails = false; // ברירת מחדל - לא להציג את הפרטים

      // Step 6: שליחת הכתובת המפורקת עם כל השדות הנדרשים להורה
      // this.addressSelected.emit(addressComponents);
      this.placeSelected.emit(savedPlace);
    } catch (error) {
      console.error('Error getting place details:', error);

      // במקרה של שגיאה, ננסה עדיין לשמור במאגר עם המידע הבסיסי
      // try {
      //   const basicPlaceData = {
      //     placeId: String(suggestion.place_id || ''),
      //     fullAddress: String(suggestion.description || ''),
      //     placeName: suggestion.structured_formatting?.main_text || '',
      //     city: String(suggestion.structured_formatting?.secondary_text || 'Unknown'),
      //     // country: 'ישראל', // ברירת מחדל
      //     // countryCode: 'IL'
      //   };

      //   console.log('Fallback: creating Place with basic data:', basicPlaceData);
      //   console.log('Fallback PlaceId type and value:', typeof basicPlaceData.placeId, basicPlaceData.placeId);
      //   const savedPlace = await Place.findOrCreate(basicPlaceData, remult.repo(Place));

      //   const basicAddress: AddressComponents = {
      //     fullAddress: suggestion.description,
      //     placeId: String(suggestion.place_id || ''),
      //     placeRecordId: savedPlace.id  // החשוב - המזהה שלנו ב-DB
      //   };

      //   // this.addressSelected.emit(basicAddress);
      // this.placeSelected.emit(savedPlace);
      // } catch (saveError) {
      //   console.error('Error saving fallback place:', saveError);

      //   // אם גם השמירה נכשלה, שלח רק את המידע הבסיסי
      //   const basicAddress: AddressComponents = {
      //     fullAddress: suggestion.description,
      //     placeId: String(suggestion.place_id || '')
      //   };
      //   this.addressSelected.emit(basicAddress);
      // }
    }
  }

  displayFn(suggestion: any): string {
    return suggestion ? suggestion.description : '';
  }

  getDisplayAddress(suggestion: any): string {
    return suggestion.description || '';
  }

  getAddressDetails(suggestion: any): string {
    // Google Places API - השתמש ב-structured_formatting
    if (suggestion.structured_formatting?.main_text) {
      return suggestion.structured_formatting.main_text;
    }

    // חילוץ החלק הראשון מה-description
    const parts = suggestion.description?.split(',') || [];
    return parts[0] || '';
  }

  getCityAndCountry(suggestion: any): string {
    // Google Places API - השתמש ב-structured_formatting
    if (suggestion.structured_formatting?.secondary_text) {
      return suggestion.structured_formatting.secondary_text;
    }

    // חילוץ החלקים האחרונים מה-description
    const parts = suggestion.description?.split(',') || [];
    if (parts.length > 1) {
      return parts.slice(1).join(',').trim();
    }

    return '';
  }

  toggleAddressDetails(): void {
    this.showAddressDetails = !this.showAddressDetails;
  }

  onDetailChange(): void {
    // עדכון הכתובת המלאה בהתאם לשינויים
    const parts = [];

    if (this.addressDetails.street) {
      parts.push(this.addressDetails.street);
    }
    if (this.addressDetails.houseNumber) {
      parts.push(this.addressDetails.houseNumber);
    }
    if (this.addressDetails.neighborhood) {
      parts.push(this.addressDetails.neighborhood);
    }
    if (this.addressDetails.city) {
      parts.push(this.addressDetails.city);
    }
    if (this.addressDetails.state) {
      parts.push(this.addressDetails.state);
    }
    if (this.addressDetails.country) {
      parts.push(this.addressDetails.country);
    }

    this.addressDetails.fullAddress = parts.filter(p => p).join(', ');
    this.searchValue = this.addressDetails.fullAddress;
    this.onChange(this.searchValue);

    // שליחת הכתובת המעודכנת להורה
    // this.addressSelected.emit(this.addressDetails);
    // this.addressSelected.emit(this.addressDetails);
  }

  getCountryDisplayName(): string {
    if (!this.addressDetails.country) return '';

    // Try to find the country in our database list
    const country = this.countries.find(c =>
      c.name === this.addressDetails.country?.name ||
      c.nameEn === this.addressDetails.country?.nameEn ||
      c.code === this.addressDetails.countryCode
    );

    if (country) {
      return `${country.name} / ${country.nameEn}`;
    }

    // Fallback to the original country name from Google
    return this.addressDetails.country.displayName;
  }
}