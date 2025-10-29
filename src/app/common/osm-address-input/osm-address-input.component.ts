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
import { I18nService } from '../../i18n/i18n.service';

// Legacy interface - kept for backward compatibility but deprecated
// Use Place entity directly instead
export interface AddressComponents {
  fullAddress: string;
  placeId?: string;
  placeRecordId?: string;
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
  ]
})
export class OsmAddressInputComponent implements ControlValueAccessor, OnDestroy, OnChanges {
  @Input() label: string = 'כתובת';
  @Input() placeholder: string = 'הקלד כתובת...';
  @Input() countryCode: string = 'il';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() place?: Place; // The Place entity this component is bound to

  @Output() placeChange = new EventEmitter<Place | undefined>();

  searchValue: string = '';
  suggestions: any[] = [];
  isLoading = false;
  selectedPlaceId: string | null = null;
  hasSelectedAddress = false;
  showAddressDetails = false;
  countries: Country[] = [];

  private searchSubject = new Subject<string>();
  private onChange = (value: string) => { };
  private onTouched = () => { };
  private justCleared = false; // דגל למניעת טעינה חוזרת מיד אחרי ניקוי

  constructor(
    private geoService: GeoService,
    public i18n: I18nService
  ) {
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
    if (changes['place']) {
      console.log('ngOnChanges - place changed:', {
        currentValue: changes['place'].currentValue,
        previousValue: changes['place'].previousValue,
        justCleared: this.justCleared
      });

      // אם זה עתה ניקינו את הכתובת, נתעלם מהשינוי הזה
      if (this.justCleared) {
        console.log('ngOnChanges - ignoring change because place was just cleared');
        this.justCleared = false;
        return;
      }

      if (changes['place'].currentValue) {
        this.loadPlaceData(changes['place'].currentValue);
      } else {
        // Clear address if place becomes undefined/null
        this.clearAddress();
      }
    }
  }

  clearAddress(): void {
    console.log('clearAddress() called - before clear:', this.place);

    // סימון שהכתובת נוקתה - למנוע טעינה חוזרת מיד אחרי
    this.justCleared = true;

    // Clear place reference
    this.place = undefined;

    this.searchValue = '';
    this.hasSelectedAddress = false;
    this.selectedPlaceId = null;
    this.showAddressDetails = false;

    console.log('Address cleared - after clear');

    // שליחת איוונט להורה שהכתובת נוקתה
    this.placeChange.emit(undefined);
    this.onChange('');

    console.log('clearAddress() completed - emit sent to parent');
  }

  private loadPlaceData(place: Place): void {
    this.searchValue = place.fullAddress || '';
    this.hasSelectedAddress = true;
    this.selectedPlaceId = place.placeId || null;

    console.log('Loaded place data:', place);
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

      // שימוש במקום השמור - עדכון ה-place הפנימי
      this.place = suggestion.savedPlace;
      this.hasSelectedAddress = true;
      this.showAddressDetails = false;

      console.log('Step 3: Using existing place record, no API call needed');
      this.placeChange.emit(this.place);
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

      // בדיקה אם יש נתונים חוזרים מהשרת
      if (!placeDetails.valid) {
        console.warn('Server returned invalid place data!');
      }

      // Step 4: שמירת המקום ב-Places טבלה מיד ברגע הבחירה (HYBRID APPROACH)
      try {
        const placeData: Partial<Place> = {
          placeId: String(suggestion.place_id || ''),
          fullAddress: String(suggestion.description || ''),
          placeName: placeDetails.name || '',
          street: placeDetails.streetname || '',
          houseNumber: placeDetails.homenumber || '',
          neighborhood: placeDetails.neighborhood || '',
          city: String(placeDetails.cityname || ''),
          state: placeDetails.state || '',
          postcode: placeDetails.postcode || '',
          countryId: countryEntity?.id,
          latitude: placeDetails.y,
          longitude: placeDetails.x
        };

        console.log('Creating/updating Place record immediately upon selection:', placeData);
        console.log('PlaceId type and value:', typeof placeData.placeId, placeData.placeId);

        // יצירה/עדכון של Place ב-DB מיד
        const savedPlace = await Place.findOrCreate(placeData, remult.repo(Place));
        console.log('Place saved successfully with ID:', savedPlace.id);

        // טעינה מחדש של ה-Place עם ה-country relation
        this.place = await remult.repo(Place).findId(savedPlace.id, {
          include: { country: true }
        }) || savedPlace;
        console.log('Place reloaded with country:', this.place.country);

        this.hasSelectedAddress = true;
        this.showAddressDetails = false;

        // שליחת ה-Place להורה
        this.placeChange.emit(this.place);
      } catch (error) {
        console.error('Error saving place:', error);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
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
    if (!this.place) return;

    // עדכון הכתובת המלאה בהתאם לשינויים (WITHOUT SAVING - HYBRID APPROACH)
    const parts = [];

    if (this.place.street) parts.push(this.place.street);
    if (this.place.houseNumber) parts.push(this.place.houseNumber);
    if (this.place.building) parts.push(this.place.building);
    if (this.place.apartment) parts.push(this.place.apartment);
    if (this.place.neighborhood) parts.push(this.place.neighborhood);
    if (this.place.city) parts.push(this.place.city);
    if (this.place.state) parts.push(this.place.state);
    if (this.place.country) parts.push(this.place.country.name);

    this.place.fullAddress = parts.filter(p => p).join(', ');
    this.searchValue = this.place.fullAddress;
    this.onChange(this.searchValue);

    // שליחת ה-Place המעודכן להורה (ללא save - ההורה ישמור אותו)
    this.placeChange.emit(this.place);
    console.log('Place updated (not saved yet):', this.place);
  }

  getCountryDisplayName(): string {
    if (!this.place?.country) return '';

    return `${this.place.country.name} / ${this.place.country.nameEn}`;
  }
}