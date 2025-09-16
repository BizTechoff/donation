import { Component, Input, Output, EventEmitter, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GeocodingService } from '../../services/geocoding.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

export interface AddressComponents {
  fullAddress: string;
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
    MatProgressSpinnerModule
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

  private searchSubject = new Subject<string>();
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor(private geocodingService: GeocodingService) {
    // הגדרת debounce לחיפוש
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 3) {
          return of([]);
        }
        this.isLoading = true;
        return this.geocodingService.searchAddresses(query, this.countryCode);
      })
    ).subscribe(suggestions => {
      this.suggestions = suggestions;
      this.isLoading = false;
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

  onSuggestionSelect(suggestion: any): void {
    console.log('Raw suggestion from OpenStreetMap:', suggestion);
    console.log('Address components from OSM:', suggestion.address);

    const parsedAddress = this.geocodingService.parseAddressFromSuggestion(suggestion);
    console.log('Parsed address components:', parsedAddress);

    this.searchValue = parsedAddress.fullAddress;
    this.onChange(this.searchValue);
    this.suggestions = [];

    // שליחת הכתובת המפורקת להורה
    this.addressSelected.emit(parsedAddress);
  }

  displayFn(suggestion: any): string {
    return suggestion ? suggestion.display_name : '';
  }

  getDisplayAddress(suggestion: any): string {
    return suggestion.display_name;
  }

  getAddressDetails(suggestion: any): string {
    const address = suggestion.address;
    const parts = [];

    if (address.road) parts.push(address.road);
    if (address.house_number) parts.push(address.house_number);
    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    }

    return parts.join(', ');
  }

  getCityAndCountry(suggestion: any): string {
    const address = suggestion.address;
    const parts = [];

    if (address.city) parts.push(address.city);
    if (address.country) parts.push(address.country);

    return parts.join(', ');
  }
}