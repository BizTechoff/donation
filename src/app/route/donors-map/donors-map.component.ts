import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { remult } from 'remult';
import { Subscription } from 'rxjs';
import { Country } from '../../../shared/entity/country';
import { Donation } from '../../../shared/entity/donation';
import { Donor } from '../../../shared/entity/donor';
import { Place } from '../../../shared/entity/place';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { DonorService } from '../../services/donor.service';
import { GeoService } from '../../services/geo.service';
import { GeocodingService } from '../../services/geocoding.service';
import { GlobalFilterService } from '../../services/global-filter.service';
import { SidebarService } from '../../services/sidebar.service';
import { DonorMapController, DonorMapData } from '../../../shared/controllers/donor-map.controller';
import { User } from '../../../shared/entity/user';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

// Map filter interface
export interface MapFilters {
  statusFilter: string[];
  hasCoordinates: boolean | null;
  minTotalDonations: number;
  maxTotalDonations: number;
  minDonationCount: number;
  hasRecentDonation: boolean | null;
  searchTerm: string;
}

@Component({
  selector: 'app-donors-map',
  templateUrl: './donors-map.component.html',
  styleUrls: ['./donors-map.component.scss']
})
export class DonorsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;

  private map!: L.Map;
  private markersLayer!: L.FeatureGroup;
  private subscription = new Subscription();

  // All donor map data loaded from server
  donorsMapData: DonorMapData[] = [];
  filteredDonorsMapData: DonorMapData[] = [];

  loading = false;
  showSummary = true;
  isFullscreen = false;

  // Map filters
  mapFilters: MapFilters = {
    statusFilter: [],
    hasCoordinates: null,
    minTotalDonations: 0,
    maxTotalDonations: 999999999,
    minDonationCount: 0,
    hasRecentDonation: null,
    searchTerm: ''
  };

  // Filter options
  statusOptions = [
    { value: 'active', label: 'פעיל', color: '#27ae60' },
    { value: 'inactive', label: 'לא פעיל', color: '#95a5a6' },
    { value: 'high-donor', label: 'תורם גדול', color: '#f39c12' },
    { value: 'recent-donor', label: 'תרם לאחרונה', color: '#e74c3c' }
  ];

  constructor(
    private geocodingService: GeocodingService,
    public i18n: I18nService,
    private router: Router,
    private ui: UIToolsService,
    private donorService: DonorService,
    private filterService: GlobalFilterService,
    private geoService: GeoService,
    private cdr: ChangeDetectorRef,
    private sidebarService: SidebarService
  ) { }

  // סטטיסטיקות
  get totalDonors(): number {
    return this.donorsMapData.length;
  }

  get activeDonors(): number {
    return this.donorsMapData.filter(d => d.donor.isActive).length;
  }

  get averageDonation(): number {
    if (this.donorsMapData.length === 0) return 0;
    const totalAmount = this.donorsMapData.reduce((sum, d) => sum + d.stats.totalDonations, 0);
    const totalCount = this.donorsMapData.reduce((sum, d) => sum + d.stats.donationCount, 0);
    return totalCount > 0 ? totalAmount / totalCount : 0;
  }

  get donorsOnMap(): number {
    return this.donorsMapData.filter(d => {
      return d.donorPlace?.place?.latitude && d.donorPlace?.place?.longitude;
    }).length;
  }

  async ngOnInit() {
    // Register global functions for popup callbacks
    (window as any).openDonorDetails = (donorId: string) => {
      this.openDonorDetails(donorId);
    };

    (window as any).addDonationForDonor = (donorId: string) => {
      this.addDonationForDonor(donorId);
    };

    // Load saved map settings
    await this.loadMapSettings();

    // Subscribe to global filter changes
    this.subscription.add(
      this.filterService.filters$.subscribe((filters) => {
        console.log('DonorsMap: Global filters changed:', filters);
        this.loadData();
      })
    );

    await this.loadData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
      setTimeout(() => {
        this.addMarkersToMap();
      }, 500);
    }, 250);
  }

  // This ngOnDestroy method was moved to the end of the class

  async loadData() {
    this.loading = true;
    try {
      // Use DonorService to get filtered donor IDs
      const currentFilters = this.filterService.currentFilters;
      console.log('DonorsMap: Loading donors with filters:', currentFilters);

      const filteredDonors = await this.donorService.findFiltered();
      const donorIds = filteredDonors.map(d => d.id);

      // Load all map data from server in a single call
      this.donorsMapData = await DonorMapController.loadDonorsMapData(donorIds);

      // Apply local map filters
      this.applyMapFilters();

      console.log('DonorsMap: Loaded donor map data:', this.donorsMapData.length);
      console.log('DonorsMap: Filtered donors:', this.filteredDonorsMapData.length);
      console.log('DonorsMap: Donors with locations:', this.donorsOnMap);

      // Update map markers if map is initialized
      if (this.map && this.markersLayer) {
        this.addMarkersToMap();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  // Load map settings from user preferences
  async loadMapSettings() {
    if (!remult.user?.id) return;

    try {
      const userRepo = remult.repo(User);
      const user = await userRepo.findId(remult.user.id);

      if (user?.settings?.mapSettings) {
        const savedSettings = user.settings.mapSettings;

        // Load fullscreen preference
        if (savedSettings.fullscreen !== undefined) {
          this.isFullscreen = savedSettings.fullscreen;
        }

        // Load filter preferences
        if (savedSettings.filters) {
          this.mapFilters = {
            ...this.mapFilters,
            ...savedSettings.filters
          };
        }
      }
    } catch (error) {
      console.error('Error loading map settings:', error);
    }
  }

  // Save map settings to user preferences
  async saveMapSettings() {
    if (!remult.user?.id) return;

    try {
      const userRepo = remult.repo(User);
      const user = await userRepo.findId(remult.user.id);

      if (user) {
        if (!user.settings) {
          user.settings = {
            openModal: 'dialog',
            calendar_heb_holidays_jews_enabled: true,
            calendar_open_heb_and_eng_parallel: true
          };
        }

        user.settings.mapSettings = {
          fullscreen: this.isFullscreen,
          filters: { ...this.mapFilters }
        };

        await userRepo.save(user);
        remult.user = user;

        console.log('Map settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving map settings:', error);
    }
  }

  // Apply local map filters to the loaded data
  applyMapFilters() {
    this.filteredDonorsMapData = this.donorsMapData.filter(donorData => {
      // Status filter
      if (this.mapFilters.statusFilter.length > 0) {
        if (!this.mapFilters.statusFilter.includes(donorData.stats.status)) {
          return false;
        }
      }

      // Coordinates filter
      if (this.mapFilters.hasCoordinates !== null) {
        const hasCoords = !!(donorData.donorPlace?.place?.latitude && donorData.donorPlace?.place?.longitude);
        if (this.mapFilters.hasCoordinates !== hasCoords) {
          return false;
        }
      }

      // Total donations filter
      if (donorData.stats.totalDonations < this.mapFilters.minTotalDonations ||
          donorData.stats.totalDonations > this.mapFilters.maxTotalDonations) {
        return false;
      }

      // Donation count filter
      if (donorData.stats.donationCount < this.mapFilters.minDonationCount) {
        return false;
      }

      // Recent donation filter
      if (this.mapFilters.hasRecentDonation !== null) {
        const hasRecent = donorData.stats.status === 'recent-donor';
        if (this.mapFilters.hasRecentDonation !== hasRecent) {
          return false;
        }
      }

      // Search term filter
      if (this.mapFilters.searchTerm.trim()) {
        const term = this.mapFilters.searchTerm.toLowerCase();
        const matchesName = donorData.donor.firstName?.toLowerCase().includes(term) ||
                           donorData.donor.lastName?.toLowerCase().includes(term) ||
                           donorData.donor.fullName?.toLowerCase().includes(term);
        const matchesAddress = donorData.fullAddress?.toLowerCase().includes(term);
        const matchesEmail = donorData.email?.toLowerCase().includes(term);

        if (!matchesName && !matchesAddress && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return this.mapFilters.statusFilter.length > 0 ||
           this.mapFilters.hasCoordinates !== null ||
           this.mapFilters.minTotalDonations > 0 ||
           this.mapFilters.maxTotalDonations < 999999999 ||
           this.mapFilters.minDonationCount > 0 ||
           this.mapFilters.hasRecentDonation !== null ||
           this.mapFilters.searchTerm.trim() !== '';
  }

  // Clear all filters
  clearMapFilters() {
    this.mapFilters = {
      statusFilter: [],
      hasCoordinates: null,
      minTotalDonations: 0,
      maxTotalDonations: 999999999,
      minDonationCount: 0,
      hasRecentDonation: null,
      searchTerm: ''
    };

    this.applyMapFilters();
    this.addMarkersToMap();
    this.saveMapSettings();
  }

  // Toggle status filter
  toggleStatusFilter(status: string) {
    const index = this.mapFilters.statusFilter.indexOf(status);
    if (index > -1) {
      this.mapFilters.statusFilter.splice(index, 1);
    } else {
      this.mapFilters.statusFilter.push(status);
    }

    this.applyMapFilters();
    this.addMarkersToMap();
    this.saveMapSettings();
  }

  // Update filter and refresh
  onFilterChange() {
    this.applyMapFilters();
    this.addMarkersToMap();
    this.saveMapSettings();
  }

  initializeMap() {
    console.log('Initializing map...');

    if (!this.mapElement?.nativeElement) {
      console.error('Map element not found!');
      return;
    }

    try {
      // מרכז המפה בישראל
      this.map = L.map(this.mapElement.nativeElement).setView([31.7683, 35.2137], 7);

      // הוסף שכבת מפה
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // יצירת שכבת סימנים
      this.markersLayer = L.featureGroup().addTo(this.map);

      // הוספת אירוע click למפה
      this.map.on('click', async (e: L.LeafletMouseEvent) => {
        await this.onMapClick(e);
      });

      console.log('Map initialized successfully');

      // Force map to redraw after a short delay
      setTimeout(() => {
        if (this.map && this.map.getContainer()) {
          try {
            this.map.invalidateSize();
            console.log('Map size invalidated');
          } catch (error) {
            console.warn('Map initialization invalidateSize error:', error);
          }
        }
      }, 200);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  addMarkersToMap() {
    if (!this.map || !this.markersLayer) {
      console.log('Map or markers layer not ready');
      return;
    }

    this.markersLayer.clearLayers();

    console.log('Adding markers for donors:', this.filteredDonorsMapData.length);
    const donorsWithCoords = this.filteredDonorsMapData.filter(d => d.donorPlace?.place?.latitude && d.donorPlace?.place?.longitude);
    console.log('Donors with coordinates:', donorsWithCoords.length);

    let addedCount = 0;
    this.filteredDonorsMapData.forEach((donorData, index) => {
      if (donorData.donorPlace?.place?.latitude && donorData.donorPlace?.place?.longitude) {
        console.log(`Adding marker ${index + 1}:`, donorData.donor.displayName, donorData.donorPlace.place.latitude, donorData.donorPlace.place.longitude);
        try {
          const marker = this.createMarkerForDonor(donorData);
          this.markersLayer.addLayer(marker);
          addedCount++;
        } catch (error) {
          console.error('Error creating marker for donor:', donorData.donor.displayName, error);
        }
      } else {
        console.log(`No coordinates for donor ${index + 1}:`, donorData.donor.displayName);
      }
    });

    console.log('Total markers added:', addedCount);
    console.log('Markers layer count:', this.markersLayer.getLayers().length);

    // Fit map to markers bounds if there are any markers
    if (addedCount > 0) {
      try {
        const bounds = this.markersLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, {
            padding: [50, 50], // Add padding around the markers
            maxZoom: 15 // Don't zoom in too much if there's only one marker
          });
          console.log('Map fitted to bounds:', bounds);
        }
      } catch (error) {
        console.warn('Error fitting map to bounds:', error);
      }
    }

    // Force map refresh
    setTimeout(() => {
      if (this.map && this.map.getContainer()) {
        try {
          this.map.invalidateSize();
        } catch (error) {
          console.warn('Map invalidateSize error:', error);
        }
      }
    }, 100);
  }

  createMarkerForDonor(donorData: DonorMapData): L.Marker {
    const color = this.getMarkerColor(donorData.stats.status);

    if (!donorData.donorPlace?.place?.latitude || !donorData.donorPlace?.place?.longitude) {
      throw new Error('Missing place coordinates');
    }

    // יצירת אייקון צבעוני
    const customIcon = L.divIcon({
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      className: 'custom-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([donorData.donorPlace.place.latitude, donorData.donorPlace.place.longitude], {
      icon: customIcon
    });

    // הוסף חלונית popup עם פרטי התורם
    const popupContent = this.createPopupContent(donorData);
    marker.bindPopup(popupContent);

    return marker;
  }

  getMarkerColor(status: string): string {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#95a5a6';
      case 'high-donor': return '#f39c12';
      case 'recent-donor': return '#e74c3c';
      default: return '#27ae60';
    }
  }

  createPopupContent(donorData: DonorMapData): string {
    const lastDonationText = donorData.stats.lastDonationDate
      ? new Date(donorData.stats.lastDonationDate).toLocaleDateString(this.i18n.lang.RTL ? 'he-IL' : 'en-US')
      : this.i18n.terms.noDataAvailable;

    const direction = this.i18n.lang.RTL ? 'rtl' : 'ltr';
    const textAlign = this.i18n.lang.RTL ? 'right' : 'left';

    return `
      <div style="direction: ${direction}; font-family: Arial, sans-serif; min-width: 250px; text-align: ${textAlign};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0; color: #2c3e50; cursor: pointer; text-decoration: underline;" onclick="window.openDonorDetails('${donorData.donor.id}')">
            ${donorData.donor.displayName}
          </h4>
          <button style="
            background: #27ae60;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.3s;
          " onclick="window.addDonationForDonor('${donorData.donor.id}')" onmouseover="this.style.backgroundColor='#229954'" onmouseout="this.style.backgroundColor='#27ae60'">
            + הוסף תרומה
          </button>
        </div>

        <div style="border-bottom: 2px solid #3498db; margin-bottom: 10px;"></div>

        <div style="margin-bottom: 8px;">
          <strong>📍 ${this.i18n.terms.addressLabel}:</strong><br>
          ${donorData.fullAddress || this.i18n.terms.notSpecifiedAddress}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📧 ${this.i18n.terms.emailLabel}:</strong> ${donorData.email || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📞 ${this.i18n.terms.phoneLabel}:</strong> ${donorData.phone || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>💰 ${this.i18n.terms.totalDonationsLabel}:</strong></span>
            <span>₪${donorData.stats.totalDonations.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📊 ${this.i18n.terms.donationCountLabel}:</strong></span>
            <span>${donorData.stats.donationCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📈 ${this.i18n.terms.averageDonationLabel}:</strong></span>
            <span>₪${donorData.stats.averageDonation.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>📅 ${this.i18n.terms.lastDonationLabel}:</strong></span>
            <span>${lastDonationText}</span>
          </div>
        </div>
      </div>
    `;
  }

  async refreshMap() {
    await this.loadData();
    this.addMarkersToMap();
  }

  toggleSummary() {
    this.showSummary = !this.showSummary;
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    // Notify sidebar service about fullscreen state change
    if (this.isFullscreen) {
      this.sidebarService.enterFullscreen();
    } else {
      this.sidebarService.exitFullscreen();
    }

    // Save fullscreen preference
    this.saveMapSettings();

    // Wait for DOM to update, then resize map
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();

        // Re-fit to bounds if we have markers
        if (this.markersLayer && this.markersLayer.getLayers().length > 0) {
          const bounds = this.markersLayer.getBounds();
          if (bounds.isValid()) {
            this.map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15
            });
          }
        }
      }
    }, 100);
  }

  // פונקציה להמרת כתובות תורמים שחסרים להם קואורדינטות
  async geocodeMissingAddresses() {
    const confirmed = confirm('האם אתה בטוח שברצונך להמיר את כל הכתובות החסרות? זה עשוי לקחת זמן ולעלות כסף (Google API)');

    if (!confirmed) {
      return;
    }

    this.loading = true;

    try {
      // Call the backend method to geocode all missing places
      const result: any = await Place.geocodeMissingPlaces();

      this.loading = false;

      if (result.success && result.processed !== undefined) {
        const message = `הושלמה המרת כתובות!\n\nסה"כ עובדו: ${result.processed}\nעודכנו בהצלחה: ${result.updated}\nנכשלו: ${result.failed}`;
        alert(message);

        // Reload the data and refresh the map
        await this.loadData();
        this.addMarkersToMap();
      } else {
        alert('שגיאה בהמרת כתובות');
      }
    } catch (error) {
      this.loading = false;
      console.error('Error calling geocodeMissingPlaces:', error);
      alert('שגיאה בהמרת כתובות: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Navigation and action methods for popup buttons
  async openDonorDetails(donorId: string) {
    // Open donor details modal instead of navigating
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      // Reload data if donor was changed to refresh the map
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(async () => {
        await this.loadData();
        this.addMarkersToMap();
      });
    }
  }

  async addDonationForDonor(donorId: string) {
    // Open donation modal directly with pre-selected donor
    const changed = await this.ui.donationDetailsDialog('new', { donorId });
    if (changed) {
      // Reload all data if needed to refresh the map with updated stats
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(async () => {
        await this.loadData();
        this.addMarkersToMap();
      });
    }
  }

  async onMapClick(e: L.LeafletMouseEvent) {
    const { lat, lng } = e.latlng;
    console.log('Map clicked at:', lat, lng);
    if (!e.originalEvent.ctrlKey) return
    
    try {
      // הצגת אינדיקטור טעינה
      this.loading = true;

      // בצע reverse geocoding
      const result = await this.geoService.reverseGeocode(lat, lng);

      this.loading = false;

      if (result && result.success) {
        // הצג דיאלוג אישור עם הכתובת
        const message = this.i18n.terms.createNewDonorAtLocationQuestion
          .replace('{address}', result.formattedAddress);

        const shouldCreate = await this.ui.yesNoQuestion(message);

        if (shouldCreate) {
          // פתיחת דיאלוג תורם חדש עם הכתובת
          await this.createNewDonorWithAddress(result, lat, lng);
        }
      } else {
        this.ui.error(this.i18n.terms.addressNotFoundForLocation);
      }
    } catch (error) {
      console.error('Error in map click handler:', error);
      this.loading = false;
      this.ui.error(this.i18n.terms.errorGettingAddress);
    }
  }

  async createNewDonorWithAddress(geocodeResult: any, lat: number, lng: number) {
    try {
      // השתמש ב-placeDto שמגיע מהשרת
      const placeDto = geocodeResult.placeDto;

      if (!placeDto || !placeDto.valid) {
        this.ui.error(this.i18n.terms.errorGettingAddress);
        return;
      }

      // קבלת קוד מדינה
      const countryCode = placeDto.countryCode || 'IL';

      // טעינת ישות Country מהמסד נתונים
      let countryEntity: Country | undefined;
      try {
        countryEntity = await remult.repo(Country).findFirst({
          code: countryCode
        });

        if (!countryEntity) {
          console.warn(`Country with code ${countryCode} not found, creating new...`);
          const countryName = placeDto.countryName || placeDto.country || countryCode;
          countryEntity = await remult.repo(Country).insert({
            name: countryName,
            nameEn: countryName,
            code: countryCode.toUpperCase(),
            phonePrefix: '',
            currency: 'USD',
            currencySymbol: '$',
            isActive: true
          });
        }
      } catch (error) {
        console.error('Error loading/creating country:', error);
      }

      // יצירת Place מ-placeDto
      const placeData: Partial<Place> = {
        placeId: geocodeResult.placeId,
        fullAddress: geocodeResult.formattedAddress,
        placeName: placeDto.name || '',
        street: placeDto.streetname || '',
        houseNumber: placeDto.homenumber ? String(placeDto.homenumber) : '',
        neighborhood: placeDto.neighborhood || '',
        city: placeDto.cityname || '',
        state: placeDto.state || '',
        postcode: placeDto.postcode || '',
        countryId: countryEntity?.id,
        latitude: placeDto.y,
        longitude: placeDto.x
      };

      console.log('Creating Place from map click:', placeData);

      // findOrCreate returns Place with country relation already loaded
      const place = await Place.findOrCreate(placeData, remult.repo(Place));

      // פתיחת דיאלוג תורם חדש עם המקום
      const changed = await this.ui.donorDetailsDialog('new', { initialPlace: place });

      if (changed) {
        // רענן את המפה
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(async () => {
          await this.loadData();
          this.addMarkersToMap();
        });
      }
    } catch (error) {
      console.error('Error creating donor with address:', error);
      this.ui.error(this.i18n.terms.errorCreatingDonor);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }

    // Clean up subscriptions
    this.subscription.unsubscribe();

    // Clean up global functions
    delete (window as any).openDonorDetails;
    delete (window as any).addDonationForDonor;
  }
}
