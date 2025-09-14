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
  availableYears: number[] = [];
  
  campaignRepo = remult.repo(Campaign);
  
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
        orderBy: { name: 'asc' }
      });
      
      // Generate available years (current year and last 10 years)
      const currentYear = new Date().getFullYear();
      this.availableYears = [];
      for (let i = 0; i <= 10; i++) {
        this.availableYears.push(currentYear - i);
      }
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
    return Object.keys(this.currentFilters).length > 0;
  }
  
  get activeFiltersCount(): number {
    return Object.keys(this.currentFilters).filter(key => 
      this.currentFilters[key as keyof GlobalFilters] !== undefined &&
      this.currentFilters[key as keyof GlobalFilters] !== null &&
      this.currentFilters[key as keyof GlobalFilters] !== ''
    ).length;
  }
  
  getCampaignName(campaignId: string): string {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    return campaign?.name || campaignId;
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'active': return this.i18n.currentTerms.active || 'Active';
      case 'inactive': return this.i18n.currentTerms.inactive || 'Inactive';
      case 'all': return this.i18n.currentTerms.all || 'All';
      default: return status;
    }
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