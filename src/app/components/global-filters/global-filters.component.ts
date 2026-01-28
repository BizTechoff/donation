import { Component, OnInit, OnDestroy, ViewChild, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { remult } from 'remult';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { openDialog } from 'common-ui-elements';
import { GlobalFilterService, GlobalFilters } from '../../services/global-filter.service';
import { Campaign } from '../../../shared/entity/campaign';
import { Country } from '../../../shared/entity/country';
import { TargetAudience } from '../../../shared/entity/target-audience';
import { I18nService } from '../../i18n/i18n.service';
import { PlaceController } from '../../../shared/controllers/place.controller';
import { UIToolsService } from '../../common/UIToolsService';
import { TriStateFilter } from '../../../shared/enum/tri-state-filter';

@Component({
  selector: 'app-global-filters',
  templateUrl: './global-filters.component.html',
  styleUrls: ['./global-filters.component.scss']
})
export class GlobalFiltersComponent implements OnInit, OnDestroy {

  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;

  currentFilters: GlobalFilters = { isAnash: TriStateFilter.All, isAlumni: TriStateFilter.All };
  campaigns: Campaign[] = [];
  countries: Country[] = [];
  cities: string[] = [];
  neighborhoods: string[] = [];
  targetAudiences: TargetAudience[] = [];

  campaignRepo = remult.repo(Campaign);
  countryRepo = remult.repo(Country);
  targetAudienceRepo = remult.repo(TargetAudience);

  private subscription = new Subscription();

  // Debounce subjects for amount inputs
  private amountMinSubject = new Subject<number | undefined>();
  private amountMaxSubject = new Subject<number | undefined>();

  constructor(
    private filterService: GlobalFilterService,
    public i18n: I18nService,
    private elementRef: ElementRef,
    private ui: UIToolsService,
    private cdr: ChangeDetectorRef
  ) {}
  
  async ngOnInit() {
    // Subscribe to filter changes first
    this.subscription.add(
      this.filterService.filters$.subscribe(filters => {
        this.currentFilters = filters;
        // Trigger change detection after filters update
        this.cdr.detectChanges();
      })
    );

    // Setup debounce for amount min input (800ms delay)
    this.subscription.add(
      this.amountMinSubject.pipe(debounceTime(800)).subscribe(async value => {
        console.log('GlobalFilters: Updating amountMin to', value);
        await this.updateFilter('amountMin', value);
        console.log('GlobalFilters: amountMin updated');
      })
    );

    // Setup debounce for amount max input (800ms delay)
    this.subscription.add(
      this.amountMaxSubject.pipe(debounceTime(800)).subscribe(async value => {
        console.log('GlobalFilters: Updating amountMax to', value);
        await this.updateFilter('amountMax', value);
        console.log('GlobalFilters: amountMax updated');
      })
    );

    // Load dropdown data
    await this.loadData();

    // Force change detection after data is loaded to update display
    this.cdr.detectChanges();
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  async loadData() {
    try {
      // Load all campaigns (including inactive ones to display their names in filters)
      this.campaigns = await this.campaignRepo.find({
        orderBy: { name: 'asc' as 'asc' }
      });

      // Load all countries (including inactive ones to display their names in filters)
      this.countries = await this.countryRepo.find({
        orderBy: { name: 'asc' as 'asc' }
      });

      // Load cities and neighborhoods from backend
      const placeData = await PlaceController.loadBase();
      this.cities = placeData.cities;
      this.neighborhoods = placeData.neighborhoods;

      // Load all target audiences (including inactive ones to display their names in filters)
      this.targetAudiences = await this.targetAudienceRepo.find({
        orderBy: { name: 'asc' as 'asc' }
      });
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  }
  
  async updateFilter(key: keyof GlobalFilters, value: any) {
    await this.filterService.updateFilter(key, value);
  }

  async clearFilters() {
    await this.filterService.clearFilters();
  }

  async clearFilter(key: keyof GlobalFilters) {
    await this.filterService.clearFilter(key);
  }
  
  get hasActiveFilters(): boolean {
    // Check if there are actual values, not just keys
    return !!(
      (this.currentFilters.campaignIds && this.currentFilters.campaignIds.length > 0) ||
      (this.currentFilters.countryIds && this.currentFilters.countryIds.length > 0) ||
      (this.currentFilters.cityIds && this.currentFilters.cityIds.length > 0) ||
      (this.currentFilters.neighborhoodIds && this.currentFilters.neighborhoodIds.length > 0) ||
      (this.currentFilters.targetAudienceIds && this.currentFilters.targetAudienceIds.length > 0) ||
      (this.currentFilters.dateFrom !== undefined && this.currentFilters.dateFrom !== null) ||
      (this.currentFilters.dateTo !== undefined && this.currentFilters.dateTo !== null) ||
      (this.currentFilters.amountMin !== undefined && this.currentFilters.amountMin !== null) ||
      (this.currentFilters.amountMax !== undefined && this.currentFilters.amountMax !== null) ||
      (this.currentFilters.isAnash && this.currentFilters.isAnash !== TriStateFilter.All) ||
      (this.currentFilters.isAlumni && this.currentFilters.isAlumni !== TriStateFilter.All)
    );
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.currentFilters.campaignIds && this.currentFilters.campaignIds.length > 0) count += this.currentFilters.campaignIds.length;
    if (this.currentFilters.countryIds && this.currentFilters.countryIds.length > 0) count += this.currentFilters.countryIds.length;
    if (this.currentFilters.cityIds && this.currentFilters.cityIds.length > 0) count += this.currentFilters.cityIds.length;
    if (this.currentFilters.neighborhoodIds && this.currentFilters.neighborhoodIds.length > 0) count += this.currentFilters.neighborhoodIds.length;
    if (this.currentFilters.targetAudienceIds && this.currentFilters.targetAudienceIds.length > 0) count += this.currentFilters.targetAudienceIds.length;
    if (this.currentFilters.dateFrom) count++;
    if (this.currentFilters.dateTo) count++;
    if (this.currentFilters.amountMin !== undefined) count++;
    if (this.currentFilters.amountMax !== undefined) count++;
    if (this.currentFilters.isAnash && this.currentFilters.isAnash !== TriStateFilter.All) count++;
    if (this.currentFilters.isAlumni && this.currentFilters.isAlumni !== TriStateFilter.All) count++;
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

  getTargetAudienceName(targetAudienceId: string): string {
    const targetAudience = this.targetAudiences.find(ta => ta.id === targetAudienceId);
    return targetAudience?.name || this.i18n.terms.targetAudienceNotFound;
  }

  async removeCampaignFilter(campaignId: string) {
    const currentIds = this.currentFilters.campaignIds || [];
    const updatedIds = currentIds.filter(id => id !== campaignId);
    await this.updateFilter('campaignIds', updatedIds.length > 0 ? updatedIds : undefined);
  }

  async removeCountryFilter(countryId: string) {
    const currentIds = this.currentFilters.countryIds || [];
    const updatedIds = currentIds.filter(id => id !== countryId);
    await this.updateFilter('countryIds', updatedIds.length > 0 ? updatedIds : undefined);
  }

  async removeTargetAudienceFilter(targetAudienceId: string) {
    const currentIds = this.currentFilters.targetAudienceIds || [];
    const updatedIds = currentIds.filter(id => id !== targetAudienceId);
    await this.updateFilter('targetAudienceIds', updatedIds.length > 0 ? updatedIds : undefined);
  }

  async removeCityFilter(city: string) {
    const currentIds = this.currentFilters.cityIds || [];
    const updatedIds = currentIds.filter(id => id !== city);
    await this.updateFilter('cityIds', updatedIds.length > 0 ? updatedIds : undefined);
  }

  async removeNeighborhoodFilter(neighborhood: string) {
    const currentIds = this.currentFilters.neighborhoodIds || [];
    const updatedIds = currentIds.filter(id => id !== neighborhood);
    await this.updateFilter('neighborhoodIds', updatedIds.length > 0 ? updatedIds : undefined);
  }
  
  async onDateFromChange(date: Date | null) {
    await this.updateFilter('dateFrom', date);
  }

  async onDateToChange(date: Date | null) {
    await this.updateFilter('dateTo', date);
  }

  onAmountMinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value ? +input.value : undefined;
    this.amountMinSubject.next(value);
  }

  onAmountMaxInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value ? +input.value : undefined;
    this.amountMaxSubject.next(value);
  }

  async clearAmountFilter() {
    await this.filterService.updateFilters({
      amountMin: undefined,
      amountMax: undefined
    });
  }

  async onIsAnashToggle(value: 'yes' | 'no', checked: boolean) {
    // If checked, set the filter; if unchecked, reset to 'all'
    await this.updateFilter('isAnash', checked ? value as TriStateFilter : TriStateFilter.All);
  }

  async onIsAlumniToggle(value: 'yes' | 'no', checked: boolean) {
    // If checked, set the filter; if unchecked, reset to 'all'
    await this.updateFilter('isAlumni', checked ? value as TriStateFilter : TriStateFilter.All);
  }

  getAmountFilterDisplay(): string {
    const min = this.currentFilters.amountMin;
    const max = this.currentFilters.amountMax;

    if (min !== undefined && max !== undefined) {
      return `${min.toLocaleString()} - ${max.toLocaleString()}`;
    } else if (min !== undefined) {
      return `מ-${min.toLocaleString()}`;
    } else if (max !== undefined) {
      return `עד ${max.toLocaleString()}`;
    }
    return '';
  }

  async openCampaignSelectionModal(event: Event) {
    event.stopPropagation();
    this.menuTrigger?.closeMenu();

    const result = await openDialog(
      (await import('../../routes/modals/campaign-selection-modal/campaign-selection-modal.component')).CampaignSelectionModalComponent,
      (modal: any) => {
        modal.args = {
          title: this.i18n.terms.selectCampaignTitle,
          multiSelect: true,
          selectedIds: this.currentFilters.campaignIds || []
        };
      }
    );

    // Only update if user actually made a selection (not null/undefined from cancel)
    if (result !== null && result !== undefined) {
      if (Array.isArray(result) && result.length > 0) {
        const selectedIds = result.map((c: Campaign) => c.id);
        this.updateFilter('campaignIds', selectedIds.length > 0 ? selectedIds : undefined);
      } else if (Array.isArray(result) && result.length === 0) {
        // User explicitly cleared all selections
        this.updateFilter('campaignIds', undefined);
      }
    }

    // Reload data after filter update (in case new items were created in the modal)
    await this.loadData();
  }

  async openCountrySelectionModal(event: Event) {
    event.stopPropagation();
    this.menuTrigger?.closeMenu();

    const result = await openDialog(
      (await import('../../routes/modals/country-selection-modal/country-selection-modal.component')).CountrySelectionModalComponent,
      (modal: any) => {
        modal.args = {
          title: this.i18n.terms.selectCountryTitle,
          multiSelect: true,
          selectedIds: this.currentFilters.countryIds || []
        };
      }
    );

    // Only update if user actually made a selection (not null/undefined from cancel)
    if (result !== null && result !== undefined) {
      if (Array.isArray(result) && result.length > 0) {
        const selectedIds = result.map((c: Country) => c.id);
        this.updateFilter('countryIds', selectedIds.length > 0 ? selectedIds : undefined);
      } else if (Array.isArray(result) && result.length === 0) {
        // User explicitly cleared all selections
        this.updateFilter('countryIds', undefined);
      }
    }

    // Reload data after filter update (in case new items were created in the modal)
    await this.loadData();
  }

  async openCitySelectionModal(event: Event) {
    event.stopPropagation();
    this.menuTrigger?.closeMenu();

    const result = await openDialog(
      (await import('../../routes/modals/city-selection-modal/city-selection-modal.component')).CitySelectionModalComponent,
      (modal: any) => {
        modal.args = {
          title: this.i18n.terms.selectCityTitle,
          multiSelect: true,
          selectedCities: this.currentFilters.cityIds || [],
          countryId: this.currentFilters.countryIds && this.currentFilters.countryIds.length === 1
            ? this.currentFilters.countryIds[0]
            : undefined
        };
      }
    );

    // Only update if user actually made a selection (not null/undefined from cancel)
    if (result !== null && result !== undefined) {
      if (Array.isArray(result) && result.length > 0) {
        this.updateFilter('cityIds', result);
      } else if (Array.isArray(result) && result.length === 0) {
        // User explicitly cleared all selections
        this.updateFilter('cityIds', undefined);
      }
    }

    // Reload data after filter update (in case new items were created in the modal)
    await this.loadData();
  }

  async openNeighborhoodSelectionModal(event: Event) {
    event.stopPropagation();
    this.menuTrigger?.closeMenu();

    const result = await openDialog(
      (await import('../../routes/modals/neighborhood-selection-modal/neighborhood-selection-modal.component')).NeighborhoodSelectionModalComponent,
      (modal: any) => {
        modal.args = {
          title: this.i18n.terms.selectNeighborhoodTitle,
          multiSelect: true,
          selectedNeighborhoods: this.currentFilters.neighborhoodIds || [],
          city: this.currentFilters.cityIds && this.currentFilters.cityIds.length === 1
            ? this.currentFilters.cityIds[0]
            : undefined,
          countryId: this.currentFilters.countryIds && this.currentFilters.countryIds.length === 1
            ? this.currentFilters.countryIds[0]
            : undefined
        };
      }
    );

    // Only update if user actually made a selection (not null/undefined from cancel)
    if (result !== null && result !== undefined) {
      if (Array.isArray(result) && result.length > 0) {
        this.updateFilter('neighborhoodIds', result);
      } else if (Array.isArray(result) && result.length === 0) {
        // User explicitly cleared all selections
        this.updateFilter('neighborhoodIds', undefined);
      }
    }

    // Reload data after filter update (in case new items were created in the modal)
    await this.loadData();
  }

  async openAudienceSelectionModal(event: Event) {
    event.stopPropagation();
    this.menuTrigger?.closeMenu();

    const result = await this.ui.openAudienceSelection({
      title: this.i18n.terms.manageTargetAudiences,
      multiSelect: true,
      selectedIds: this.currentFilters.targetAudienceIds || []
    });

    // Always reload audiences list to reflect any changes (even if cancelled)
    await this.loadData();

    if (result) {
      // Update filter with selected audiences
      const selectedIds = Array.isArray(result) ? result.map((a: TargetAudience) => a.id) : [result.id];
      this.updateFilter('targetAudienceIds', selectedIds.length > 0 ? selectedIds : undefined);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menuTrigger || !this.menuTrigger.menuOpen) {
      return;
    }

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    const clickedOnOverlay = (event.target as HTMLElement).closest('.cdk-overlay-pane');

    if (!clickedInside && !clickedOnOverlay) {
      this.menuTrigger.closeMenu();
    }
  }
}