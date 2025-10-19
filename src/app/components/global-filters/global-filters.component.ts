import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { GlobalFilterService, GlobalFilters } from '../../services/global-filter.service';
import { Campaign } from '../../../shared/entity/campaign';
import { Country } from '../../../shared/entity/country';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-global-filters',
  templateUrl: './global-filters.component.html',
  styleUrls: ['./global-filters.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatChipsModule,
    MatCheckboxModule,
    MatTooltipModule
  ]
})
export class GlobalFiltersComponent implements OnInit, OnDestroy {
  
  currentFilters: GlobalFilters = {};
  campaigns: Campaign[] = [];
  countries: Country[] = [];

  campaignRepo = remult.repo(Campaign);
  countryRepo = remult.repo(Country);
  
  private subscription = new Subscription();
  
  constructor(
    private filterService: GlobalFilterService,
    public i18n: I18nService
  ) {}
  
  async ngOnInit() {
    // Subscribe to filter changes
    this.subscription.add(
      this.filterService.filters$.subscribe(filters => {
        this.currentFilters = filters;
      })
    );
    
    // Load dropdown data
    await this.loadData();
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  async loadData() {
    try {
      // Load campaigns
      this.campaigns = await this.campaignRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' as 'asc' }
      });

      // Load countries
      this.countries = await this.countryRepo.find({
        where: { isActive: true },
        orderBy: { name: 'asc' as 'asc' }
      });
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  }
  
  updateFilter(key: keyof GlobalFilters, value: any) {
    this.filterService.updateFilter(key, value);
  }
  
  clearFilters() {
    this.filterService.clearFilters();
  }
  
  clearFilter(key: keyof GlobalFilters) {
    this.filterService.clearFilter(key);
  }
  
  get hasActiveFilters(): boolean {
    // Check if there are actual values, not just keys
    const hasValues =
      (this.currentFilters.campaignIds && this.currentFilters.campaignIds.length > 0) ||
      (this.currentFilters.countryIds && this.currentFilters.countryIds.length > 0) ||
      (this.currentFilters.dateFrom !== undefined && this.currentFilters.dateFrom !== null) ||
      (this.currentFilters.dateTo !== undefined && this.currentFilters.dateTo !== null) ||
      (this.currentFilters.amountMin !== undefined && this.currentFilters.amountMin !== null) ||
      (this.currentFilters.amountMax !== undefined && this.currentFilters.amountMax !== null);

    return hasValues;
  }
  
  get activeFiltersCount(): number {
    let count = 0;
    if (this.currentFilters.campaignIds && this.currentFilters.campaignIds.length > 0) count += this.currentFilters.campaignIds.length;
    if (this.currentFilters.countryIds && this.currentFilters.countryIds.length > 0) count += this.currentFilters.countryIds.length;
    if (this.currentFilters.dateFrom) count++;
    if (this.currentFilters.dateTo) count++;
    if (this.currentFilters.amountMin !== undefined) count++;
    if (this.currentFilters.amountMax !== undefined) count++;
    return count;
  }
  
  getCampaignName(campaignId: string): string {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    return campaign?.name || campaignId;
  }

  getCountryDisplayName(countryId: string): string {
    const country = this.countries.find(c => c.id === countryId);
    return country?.displayName || countryId;
  }
  
  removeCampaignFilter(campaignId: string) {
    const currentIds = this.currentFilters.campaignIds || [];
    const updatedIds = currentIds.filter(id => id !== campaignId);
    this.updateFilter('campaignIds', updatedIds.length > 0 ? updatedIds : undefined);
  }

  removeCountryFilter(countryId: string) {
    const currentIds = this.currentFilters.countryIds || [];
    const updatedIds = currentIds.filter(id => id !== countryId);
    this.updateFilter('countryIds', updatedIds.length > 0 ? updatedIds : undefined);
  }
  
  onDateFromChange(date: Date | null) {
    this.updateFilter('dateFrom', date);
  }

  onDateToChange(date: Date | null) {
    this.updateFilter('dateTo', date);
  }

  onAmountMinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value ? +input.value : undefined;
    this.updateFilter('amountMin', value);
  }

  onAmountMaxInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value ? +input.value : undefined;
    this.updateFilter('amountMax', value);
  }
}