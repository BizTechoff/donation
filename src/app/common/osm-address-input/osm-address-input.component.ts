import { Component, Input, Output, EventEmitter, OnDestroy, forwardRef } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { GeoService } from '../../services/geo.service';

export interface AddressComponents {
  fullAddress: string;
  placeId?: string;
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
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
export class OsmAddressInputComponent implements ControlValueAccessor, OnDestroy {
  @Input() label: string = 'כתובת';
  @Input() placeholder: string = 'הקלד כתובת...';
  @Input() countryCode: string = 'il';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;

  @Output() addressSelected = new EventEmitter<AddressComponents>();

  searchValue: string = '';
  suggestions: any[] = [];
  isLoading = false;
  selectedPlaceId: string | null = null;
  hasSelectedAddress = false;
  showAddressDetails = false;
  addressDetails: AddressComponents = {
    fullAddress: '',
    placeId: '',
    street: '',
    houseNumber: '',
    neighborhood: '',
    city: '',
    postcode: '',
    country: '',
    countryCode: '',
    placeName: ''
  };

  private searchSubject = new Subject<string>();
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor(private geoService: GeoService) {
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
        const predictions = await this.geoService.getPlacesSuggestions(query);
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
    this.searchValue = value;
    this.onChange(value);

    if (value.length >= 3) {
      this.searchSubject.next(value);
    } else {
      this.suggestions = [];
    }
  }

  onFocus(): void {
    this.onTouched();
  }

  async onSuggestionSelect(suggestion: any): Promise<void> {
    console.log('Step 1: User selected from Google Places suggestions:', suggestion);

    this.selectedPlaceId = suggestion.place_id;
    this.searchValue = suggestion.description;
    this.onChange(this.searchValue);
    this.suggestions = [];

    // Step 2: קבלת פרטים מלאים על המקום באמצעות place_id
    try {
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
      const addressComponents: AddressComponents = {
        fullAddress: suggestion.description,
        placeId: suggestion.place_id,  // שמירת ה-place_id למזהה חד-ערכי
        latitude: placeDetails.y,  // y = latitude
        longitude: placeDetails.x, // x = longitude
        street: placeDetails.streetname || '',
        houseNumber: placeDetails.homenumber || '',
        city: placeDetails.cityname || '',
        country: 'ישראל',  // ברירת מחדל לישראל
        countryCode: 'IL',
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
        country: addressComponents.country || 'חסר',
        neighborhood: addressComponents.neighborhood || 'חסר',
        postcode: addressComponents.postcode || 'חסר'
      });

      console.log('Step 4: Final parsed address components:', addressComponents);

      // שמירת הפרטים למקרה של עריכה
      this.addressDetails = { ...addressComponents };
      this.addressDetails.placeName = placeDetails.name || '';
      this.hasSelectedAddress = true;
      this.showAddressDetails = false; // ברירת מחדל - לא להציג את הפרטים

      // Step 5: שליחת הכתובת המפורקת עם כל השדות הנדרשים להורה
      this.addressSelected.emit(addressComponents);
    } catch (error) {
      console.error('Error getting place details:', error);

      // במקרה של שגיאה, שולחים לפחות את המידע הבסיסי עם place_id
      const basicAddress: AddressComponents = {
        fullAddress: suggestion.description,
        placeId: suggestion.place_id  // תמיד נשמור את ה-place_id
      };
      this.addressSelected.emit(basicAddress);
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
    if (this.addressDetails.country) {
      parts.push(this.addressDetails.country);
    }

    this.addressDetails.fullAddress = parts.filter(p => p).join(', ');
    this.searchValue = this.addressDetails.fullAddress;
    this.onChange(this.searchValue);

    // שליחת הכתובת המעודכנת להורה
    this.addressSelected.emit(this.addressDetails);
  }
}