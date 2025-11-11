import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { I18nService } from '../../i18n/i18n.service';

export interface NavigationRecord {
  id: string;
  displayName: string;
  [key: string]: any;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'range' | 'amount';
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: any;
  displayValue: string;
  isNegative?: boolean; // For "not" filters like "ללא אנ"ש"
}

@Component({
  selector: 'app-modal-navigation-header',
  templateUrl: './modal-navigation-header.component.html',
  styleUrls: ['./modal-navigation-header.component.scss']
})
export class ModalNavigationHeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() records: NavigationRecord[] = [];
  @Input() currentRecordId: string = '';
  @Input() filterOptions: FilterOption[] = [];
  @Input() placeholder: string = 'חיפוש...';
  
  @Output() recordSelected = new EventEmitter<NavigationRecord>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() filtersChanged = new EventEmitter<ActiveFilter[]>();
  @Output() navigateNext = new EventEmitter<void>();
  @Output() navigatePrevious = new EventEmitter<void>();

  searchTerm: string = '';
  filteredRecords: NavigationRecord[] = [];
  activeFilters: ActiveFilter[] = [];
  showFilters: boolean = false;
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Filter form values
  selectedFilterKey: string = '';
  selectedFilterValue: any = '';
  rangeMin: number = 0;
  rangeMax: number = 100;
  amountMin: number = 0;
  amountMax: number = 10000;

  constructor(public i18n: I18nService) {}

  ngOnInit() {
    this.setupSearchDebounce();
    this.updateFilteredRecords();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(
        debounceTime(300), // 300ms debounce as requested
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.searchChanged.emit(searchTerm);
        this.updateFilteredRecords();
      });
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  private updateFilteredRecords() {
    let filtered = [...this.records];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.displayName.toLowerCase().includes(term)
      );
    }

    // Apply active filters
    filtered = this.applyActiveFilters(filtered);

    this.filteredRecords = filtered;
  }

  private applyActiveFilters(records: NavigationRecord[]): NavigationRecord[] {
    return records.filter(record => {
      return this.activeFilters.every(filter => {
        const recordValue = record[filter.key];
        
        if (filter.isNegative) {
          // "Not" filter - exclude records that match
          return !this.matchesFilterValue(recordValue, filter);
        } else {
          // Normal filter - include records that match
          return this.matchesFilterValue(recordValue, filter);
        }
      });
    });
  }

  private matchesFilterValue(recordValue: any, filter: ActiveFilter): boolean {
    const filterOption = this.filterOptions.find(opt => opt.key === filter.key);
    if (!filterOption) return false;

    switch (filterOption.type) {
      case 'boolean':
        return recordValue === filter.value;
      case 'select':
        return recordValue === filter.value;
      case 'range':
        const [min, max] = filter.value;
        return recordValue >= min && recordValue <= max;
      case 'amount':
        const [amountMin, amountMax] = filter.value;
        return recordValue >= amountMin && recordValue <= amountMax;
      default:
        return false;
    }
  }

  getCurrentRecordIndex(): number {
    return this.filteredRecords.findIndex(record => record.id === this.currentRecordId);
  }

  getCurrentRecord(): NavigationRecord | undefined {
    return this.filteredRecords.find(record => record.id === this.currentRecordId);
  }

  onRecordSelect(record: NavigationRecord) {
    this.recordSelected.emit(record);
    // Close the search dropdown by clearing the search term
    this.searchTerm = '';
    this.updateFilteredRecords();
  }

  onNavigateNext() {
    const currentIndex = this.getCurrentRecordIndex();
    if (currentIndex < this.filteredRecords.length - 1) {
      const nextRecord = this.filteredRecords[currentIndex + 1];
      this.recordSelected.emit(nextRecord);
    }
    this.navigateNext.emit();
  }

  onNavigatePrevious() {
    const currentIndex = this.getCurrentRecordIndex();
    if (currentIndex > 0) {
      const prevRecord = this.filteredRecords[currentIndex - 1];
      this.recordSelected.emit(prevRecord);
    }
    this.navigatePrevious.emit();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  getSelectedFilterOption(): FilterOption | undefined {
    return this.filterOptions.find(opt => opt.key === this.selectedFilterKey);
  }

  addFilter(isNegative: boolean = false) {
    const filterOption = this.getSelectedFilterOption();
    if (!filterOption || !this.selectedFilterKey) return;

    let value: any;
    let displayValue: string;

    switch (filterOption.type) {
      case 'boolean':
        value = this.selectedFilterValue;
        displayValue = value ? 'כן' : 'לא';
        break;
      case 'select':
        const selectedOption = filterOption.options?.find(opt => opt.value === this.selectedFilterValue);
        if (!selectedOption) return;
        value = this.selectedFilterValue;
        displayValue = selectedOption.label;
        break;
      case 'range':
        value = [this.rangeMin, this.rangeMax];
        displayValue = `${this.rangeMin}-${this.rangeMax}`;
        break;
      case 'amount':
        value = [this.amountMin, this.amountMax];
        displayValue = `₪${this.amountMin.toLocaleString()}-₪${this.amountMax.toLocaleString()}`;
        break;
      default:
        return;
    }

    // Check if filter already exists
    const existingFilterIndex = this.activeFilters.findIndex(
      f => f.key === this.selectedFilterKey && JSON.stringify(f.value) === JSON.stringify(value)
    );

    if (existingFilterIndex === -1) {
      const newFilter: ActiveFilter = {
        key: this.selectedFilterKey,
        label: filterOption.label,
        value: value,
        displayValue: displayValue,
        isNegative: isNegative
      };

      this.activeFilters.push(newFilter);
      this.updateFilteredRecords();
      this.filtersChanged.emit(this.activeFilters);
    }

    // Reset form
    this.selectedFilterKey = '';
    this.selectedFilterValue = '';
    this.rangeMin = 0;
    this.rangeMax = 100;
    this.amountMin = 0;
    this.amountMax = 10000;
  }

  removeFilter(index: number) {
    this.activeFilters.splice(index, 1);
    this.updateFilteredRecords();
    this.filtersChanged.emit(this.activeFilters);
  }

  clearAllFilters() {
    this.activeFilters = [];
    this.updateFilteredRecords();
    this.filtersChanged.emit(this.activeFilters);
  }

  getFilterDisplayText(filter: ActiveFilter): string {
    const prefix = filter.isNegative ? 'ללא ' : '';
    return `${prefix}${filter.label}: ${filter.displayValue}`;
  }

  canNavigateNext(): boolean {
    const currentIndex = this.getCurrentRecordIndex();
    return currentIndex >= 0 && currentIndex < this.filteredRecords.length - 1;
  }

  canNavigatePrevious(): boolean {
    const currentIndex = this.getCurrentRecordIndex();
    return currentIndex > 0;
  }

  getNavigationInfo(): string {
    const currentIndex = this.getCurrentRecordIndex();
    const total = this.filteredRecords.length;
    
    if (currentIndex === -1 || total === 0) {
      return `0 מתוך ${this.records.length}`;
    }
    
    return `${currentIndex + 1} מתוך ${total}`;
  }
}