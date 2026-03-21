import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
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
import { GlobalFilterService, GlobalFilters } from '../../services/global-filter.service';
import { SidebarService } from '../../services/sidebar.service';
import { DonorMapController, DonorMapData, MarkerData, MapFilters as BackendMapFilters, MapStatistics } from '../../../shared/controllers/donor-map.controller';
import { AppSettingsController } from '../../../shared/controllers/app-settings.controller';
import { User } from '../../../shared/entity/user';
import { Roles } from '../../../shared/enum/roles';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';

// Declare google as global
declare const google: any;

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

  private map!: google.maps.Map;
  private markers: google.maps.Marker[] = [];
  private infoWindow!: google.maps.InfoWindow;
  private currentPolygonPoints: google.maps.LatLng[] = [];
  private tempPolyline?: google.maps.Polyline;
  private drawnPolygon?: google.maps.Polygon;
  private subscription = new Subscription();
  private isCtrlPressed = false;

  // Lightweight markers loaded from server (new approach)
  markersData: MarkerData[] = [];

  loading = false;
  showSummary = true;
  isFullscreen = false;
  isPolygonMode = false;

  // Route optimization state
  isRouteActive = false;
  calculatingRoute = false;
  routeStops: { marker: MarkerData; visited: boolean; order: number }[] = [];
  routeTotalDistance = '';
  routeTotalDuration = '';
  routeLegs: { distance: string; duration: string; donorName: string }[] = [];
  savedTargetAudienceName = ''; // שם קהל היעד שנשמר מהמסלול
  private routeStartPoint?: { lat: number; lng: number }; // נקודת התחלת המסלול
  private routePolylines: google.maps.Polyline[] = [];
  private routeMarkers: google.maps.Marker[] = [];
  // Full route data for saving to DB (polyline path, distances, durations)
  private savedRoutePolylinePath: { lat: number; lng: number }[] = [];
  private savedRouteLegsData: { distanceMeters: number; durationSeconds: number }[] = [];
  private savedRouteTotalDistanceMeters = 0;
  private savedRouteTotalDurationSeconds = 0;

  // User location
  userLat: number | null = null;
  userLng: number | null = null;
  private userLocationMarker?: google.maps.Marker;

  // Flag to track if map settings were loaded (one-time operation)
  private mapSettingsLoaded = false;

  // Flag to preserve map view (center/zoom) after reload
  private preserveMapView = false;

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

  placeRepo = remult.repo(Place);
  countryRepo = remult.repo(Country);

  // App settings (thresholds)
  isAdmin = remult.isAllowed(Roles.admin);
  showSettingsPanel = false;
  highDonorAmount = 1500;
  recentDonorMonths = 11;

  // Calculated statistics (to avoid ExpressionChangedAfterItHasBeenCheckedError)
  totalDonors = 0;
  activeDonors = 0;
  averageDonation = 0;
  donorsOnMap = 0;

  constructor(
    private geocodingService: GeocodingService,
    public i18n: I18nService,
    private router: Router,
    private ui: UIToolsService,
    private donorService: DonorService,
    private globalFilterService: GlobalFilterService,
    private geoService: GeoService,
    private cdr: ChangeDetectorRef,
    private sidebarService: SidebarService,
    private hebrewDateService: HebrewDateService,
    private busy: BusyService
  ) { }

  // Statistics are now loaded from server via getMapStatistics()

  private initialLoadDone = false;

  async ngOnInit() {
    // Track Ctrl key state for map click handling
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);

    // Register global functions for popup callbacks
    (window as any).openDonorDetails = (donorId: string) => {
      this.openDonorDetails(donorId);
    };

    (window as any).addDonationForDonor = (donorId: string) => {
      this.addDonationForDonor(donorId);
    };

    (window as any).openDonorDonations = (donorId: string, donorName: string) => {
      this.openDonorDonations(donorId, donorName);
    };

    // Subscribe to global filter changes - skip first emit to avoid double load
    this.subscription.add(
      this.globalFilterService.filters$.subscribe((filters) => {
        if (this.initialLoadDone) {
          console.log('DonorsMap: Global filters changed:', filters);
          this.loadData();
        }
      })
    );

    await this.loadData();
    this.initialLoadDone = true;
  }

  async ngAfterViewInit() {
    // Load Google Maps API and initialize map
    try {
      await this.geoService.loadGoogleMapsApi();
      this.initializeMap();
      // Add markers after map is ready (short delay for DOM)
      setTimeout(() => {
        this.addMarkersToMap();
      }, 100);
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      this.ui.error('שגיאה בטעינת המפה');
    }
  }

  // This ngOnDestroy method was moved to the end of the class

  async loadData() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        // Load map settings once on first call
        if (!this.mapSettingsLoaded) {
          await this.loadMapSettings();
          await this.loadAppSettings();
          this.mapSettingsLoaded = true;
        }

        console.time('Total map load time');

        // Build map filters for backend - send all filters to server
        const backendFilters: BackendMapFilters = {
          searchTerm: this.mapFilters.searchTerm?.trim() || undefined,
          minDonationCount: this.mapFilters.minDonationCount > 0 ? this.mapFilters.minDonationCount : undefined,
          statusFilter: this.mapFilters.statusFilter.length > 0 ? this.mapFilters.statusFilter as Array<'active' | 'inactive' | 'high-donor' | 'recent-donor'> : undefined,
          hasCoordinates: this.mapFilters.hasCoordinates,
          minTotalDonations: this.mapFilters.minTotalDonations > 0 ? this.mapFilters.minTotalDonations : undefined,
          maxTotalDonations: this.mapFilters.maxTotalDonations < 999999999 ? this.mapFilters.maxTotalDonations : undefined,
          hasRecentDonation: this.mapFilters.hasRecentDonation
        };

        console.log('DonorsMap: Sending backend filters:', backendFilters);

        // Load markers and statistics in parallel
        // @ts-ignore - remult metadata not updated yet
        const [markersData, statistics] = await Promise.all([
          DonorMapController.getMapMarkers(backendFilters),
          // @ts-ignore - remult metadata not updated yet
          DonorMapController.getMapStatistics(backendFilters)
        ]);

        this.markersData = markersData;

        // Update statistics
        this.totalDonors = statistics.totalDonors;
        this.activeDonors = statistics.activeDonors;
        this.donorsOnMap = markersData.length; // מספר המרקרים שבאמת על המפה
        this.averageDonation = statistics.averageDonation;

        console.log('DonorsMap: Loaded markers:', this.markersData.length);
        console.log('DonorsMap: Statistics:', statistics);

        console.timeEnd('Total map load time');

        // Update map markers if map is initialized
        if (this.map) {
          this.addMarkersToMap();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (error && typeof error === 'object') {
          console.error('Error details:', JSON.stringify(error, null, 2));
        }
        this.ui.error('שגיאה בטעינת נתוני המפה: ' + (error instanceof Error ? error.message : String(error)));
      }
    });
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

        // Update only the settings property of remult.user, not the entire user object
        // to avoid breaking remult's permission system
        if (remult.user) {
          (remult.user as any).settings = user.settings;
        }

        console.log('Map settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving map settings:', error);
    }
  }

  // Load app settings (thresholds)
  async loadAppSettings() {
    try {
      // @ts-ignore - remult metadata not updated yet
      const settings = await AppSettingsController.getSettings();
      this.highDonorAmount = settings.highDonorAmount;
      this.recentDonorMonths = settings.recentDonorMonths;
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  }

  toggleSettingsPanel() {
    this.showSettingsPanel = !this.showSettingsPanel;
  }

  async saveAppSettings() {
    try {
      // @ts-ignore - remult metadata not updated yet
      const saved = await AppSettingsController.saveSettings(this.highDonorAmount, this.recentDonorMonths);
      this.highDonorAmount = saved.highDonorAmount;
      this.recentDonorMonths = saved.recentDonorMonths;
      this.showSettingsPanel = false;
      this.ui.info('ההגדרות נשמרו בהצלחה');
      // רענון מפה עם הספים החדשים
      this.preserveMapView = true;
      await this.loadData();
    } catch (error) {
      console.error('Error saving app settings:', error);
      this.ui.error('שגיאה בשמירת ההגדרות');
    }
  }

  // All filters are now applied on the server side in getMapMarkers()

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

    // Reload data from server with cleared filters
    this.loadData();
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

    // Reload data from server with new filters
    this.loadData();
    this.saveMapSettings();
  }

  // Update filter and refresh
  onFilterChange() {
    // Reload data from server with updated filters (searchTerm, minTotalDonations)
    this.loadData();
    this.saveMapSettings();
  }

  // Search-specific handler: search + highlight/zoom to found donor(s)
  async onSearchChange() {
    await this.loadData();
    this.saveMapSettings();

    // If search has results, highlight the found donors
    if (this.mapFilters.searchTerm?.trim() && this.markers.length > 0) {
      if (this.markers.length === 1) {
        // Single result: auto-open info window
        const markerData = this.markersData[0];
        this.markers[0].setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => this.markers[0]?.setAnimation(null), 2000);
        await this.onMarkerClick(markerData.donorId, this.markers[0]);
      } else {
        // Multiple results: bounce markers briefly
        this.markers.forEach(marker => {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 2000);
        });
      }
    }
  }

  initializeMap() {
    console.log('Initializing Google Map...');

    if (!this.mapElement?.nativeElement) {
      console.error('Map element not found!');
      return;
    }

    try {
      // Purple gradient theme style for Google Maps
      const purpleMapStyle: google.maps.MapTypeStyle[] = [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.fill',
          stylers: [{ color: '#ffffff' }, { lightness: 17 }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#ffffff' }, { lightness: 29 }, { weight: 0.2 }]
        },
        {
          featureType: 'road.arterial',
          elementType: 'geometry',
          stylers: [{ color: '#ffffff' }, { lightness: 18 }]
        },
        {
          featureType: 'road.local',
          elementType: 'geometry',
          stylers: [{ color: '#ffffff' }, { lightness: 16 }]
        },
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }, { lightness: 21 }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#dedede' }, { lightness: 21 }]
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ visibility: 'on' }, { color: '#ffffff' }, { lightness: 16 }]
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#4a4a4a' }]
        },
        {
          elementType: 'labels.icon',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#f2f2f2' }, { lightness: 19 }]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry.fill',
          stylers: [{ color: '#fefefe' }, { lightness: 20 }]
        },
        {
          featureType: 'administrative',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#667eea' }, { lightness: 17 }, { weight: 1.2 }]
        },
        {
          featureType: 'water',
          elementType: 'geometry.fill',
          stylers: [{ color: '#a5d6f7' }]
        }
      ];

      // מרכז המפה בישראל
      const mapOptions: google.maps.MapOptions = {
        center: { lat: 31.7683, lng: 35.2137 },
        zoom: 7,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false, // אנחנו משתמשים בכפתור שלנו
        zoomControl: true,
        styles: purpleMapStyle
      };

      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      // יצירת InfoWindow משותף
      this.infoWindow = new google.maps.InfoWindow();

      // הוספת אירוע click למפה
      this.map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        await this.onMapClick(e);
      });

      console.log('Google Map initialized successfully');

      // Try to get user location in background
      this.getUserLocation();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private getUserLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.showUserLocationMarker();
      },
      () => { /* User denied location - that's ok */ }
    );
  }

  showUserLocationMarker() {
    if (!this.map || this.userLat === null || this.userLng === null) return;

    if (this.userLocationMarker) {
      this.userLocationMarker.setMap(null);
    }

    this.userLocationMarker = new google.maps.Marker({
      position: { lat: this.userLat, lng: this.userLng },
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 3
      },
      title: this.i18n.terms.myLocation,
      zIndex: 999
    });
  }

  goToMyLocation() {
    if (this.userLat !== null && this.userLng !== null) {
      this.map.panTo({ lat: this.userLat, lng: this.userLng });
      this.map.setZoom(15);
    } else {
      // Try getting location again
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          this.showUserLocationMarker();
          this.map.panTo({ lat: this.userLat!, lng: this.userLng! });
          this.map.setZoom(15);
        },
        () => {
          this.ui.error('לא ניתן לקבל מיקום');
        },
        { timeout: 10000 }
      );
    }
  }

  addMarkersToMap() {
    if (!this.map) {
      console.log('Map not ready');
      return;
    }

    // Clear active route if present
    if (this.isRouteActive) {
      this.clearRoute();
    }

    // Clear existing markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    console.log('Adding markers:', this.markersData.length);

    const bounds = new google.maps.LatLngBounds();
    let addedCount = 0;

    this.markersData.forEach((markerData) => {
      try {
        const marker = this.createGoogleMarker(markerData);
        this.markers.push(marker);
        bounds.extend(marker.getPosition()!);
        addedCount++;
      } catch (error) {
        console.error('Error creating marker for donor:', markerData.donorName, error);
      }
    });

    console.log('Total markers added:', addedCount);

    // Fit map to markers bounds if there are any markers (skip if preserving view)
    if (addedCount > 0 && !this.preserveMapView) {
      this.map.fitBounds(bounds);

      // Don't zoom in too much if there's only one marker
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom()! > 15) {
          this.map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
    this.preserveMapView = false;
  }

  /**
   * Create a Google Maps marker for a donor
   */
  createGoogleMarker(markerData: MarkerData): google.maps.Marker {
    const color = this.getMarkerColor(markerData.statuses);

    // Create SVG icon for the marker
    const svgIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 3,
      scale: 10
    };

    const marker = new google.maps.Marker({
      position: { lat: markerData.lat, lng: markerData.lng },
      map: this.map,
      icon: svgIcon,
      title: markerData.donorName
    });

    // Add click listener to show info window
    marker.addListener('click', async () => {
      await this.onMarkerClick(markerData.donorId, marker);
    });

    return marker;
  }

  /**
   * Load full donor details when marker is clicked
   * Updates the info window with full information
   */
  async onMarkerClick(donorId: string, marker: google.maps.Marker) {
    try {
      // Show loading state in info window
      const direction = this.i18n.lang.RTL ? 'rtl' : 'ltr';
      const textAlign = this.i18n.lang.RTL ? 'right' : 'left';

      const loadingContent = `
        <div style="direction: ${direction}; font-family: Arial, sans-serif; min-width: 250px; text-align: ${textAlign};">
          <div style="color: #7f8c8d; padding: 20px; text-align: center;">טוען נתונים...</div>
        </div>
      `;
      this.infoWindow.setContent(loadingContent);
      this.infoWindow.open(this.map, marker);

      // Load full donor details
      // @ts-ignore - remult metadata not updated yet
      const donorData = await DonorMapController.getDonorMapDetails(donorId);

      // Create full popup content
      const fullContent = this.createPopupContent(donorData);
      this.infoWindow.setContent(fullContent);

      // Pan map to ensure info window is fully visible (especially near top edge)
      const markerPos = marker.getPosition();
      if (markerPos) {
        this.map.panTo(markerPos);
        // Shift view up by 150px to make room for info window above the marker
        this.map.panBy(0, -150);
      }
    } catch (error) {
      console.error('Error loading donor details:', error);
      const errorContent = `
        <div style="direction: rtl; font-family: Arial, sans-serif; min-width: 250px; text-align: right;">
          <div style="color: #e74c3c; padding: 20px;">שגיאה בטעינת נתונים</div>
        </div>
      `;
      this.infoWindow.setContent(errorContent);
    }
  }

  getMarkerColor(statuses: string[]): string {
    // עדיפות צבע: תורם גדול > תרם לאחרונה > פעיל > לא פעיל
    if (statuses.includes('high-donor')) return '#f39c12';
    if (statuses.includes('recent-donor')) return '#e74c3c';
    if (statuses.includes('active')) return '#27ae60';
    return '#95a5a6';
  }

  /**
   * Get the Google Maps marker for a specific donor by ID
   */
  getMarkerOf(donorId: string): google.maps.Marker | undefined {
    const index = this.markersData.findIndex(m => m.donorId === donorId);
    if (index !== -1 && index < this.markers.length) {
      return this.markers[index];
    }
    return undefined;
  }

  createPopupContent(donorData: DonorMapData): string {
    let lastDonationText = this.i18n.terms.noDataAvailable;
    if (donorData.stats.lastDonationDate) {
      try {
        const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(donorData.stats.lastDonationDate));
        lastDonationText = hebrewDate.formatted;
      } catch (error) {
        console.error('Error converting date to Hebrew:', error);
        lastDonationText = new Date(donorData.stats.lastDonationDate).toLocaleDateString('he-IL');
      }
    }

    // בנה תצוגת סה"כ תרומות לפי מטבע
    let totalDonationsDisplay = '';
    if (donorData.stats.totalDonationsByCurrency.length > 0) {
      totalDonationsDisplay = donorData.stats.totalDonationsByCurrency
        .map(c => `${c.symbol}${c.total.toLocaleString()}`)
        .join(' + ');
    } else {
      totalDonationsDisplay = `${donorData.stats.totalDonationsCurrencySymbol}${donorData.stats.totalDonations.toLocaleString()}`;
    }

    // בנה תצוגת תרומה אחרונה - עם תמיכה בהו"ק
    let lastDonationAmountDisplay = '';
    let lastDonationAmountTitle = '';
    if (donorData.stats.lastDonationAmount > 0) {
      const symbol = donorData.stats.lastDonationCurrencySymbol;
      if (donorData.stats.lastDonationIsStandingOrder) {
        // הו"ק - הצג בפועל / צפי או מטרה
        const effective = donorData.stats.lastDonationEffectiveAmount.toLocaleString();
        const expected = donorData.stats.lastDonationExpectedAmount.toLocaleString();
        lastDonationAmountDisplay = `(${symbol}${effective} / ${symbol}${expected}${donorData.stats.lastDonationIsPartner ? ' - שותף' : ''})`;
        lastDonationAmountTitle = 'שולם בפועל / צפי';
      } else {
        // תרומה רגילה
        lastDonationAmountDisplay = `(${symbol}${donorData.stats.lastDonationAmount.toLocaleString()}${donorData.stats.lastDonationIsPartner ? ' - שותף' : ''})`;
        lastDonationAmountTitle = 'סכום';
      }
    }

    // בנה תצוגת התחייבויות - בפועל / נקוב
    const commitmentDisplay = donorData.stats.commitmentCount > 0
      ? `${donorData.stats.commitmentCurrencySymbol}${donorData.stats.commitmentPaidTotal.toLocaleString()} / ${donorData.stats.commitmentCurrencySymbol}${donorData.stats.commitmentPledgedTotal.toLocaleString()}`
      : '';

    const direction = this.i18n.lang.RTL ? 'rtl' : 'ltr';
    const textAlign = this.i18n.lang.RTL ? 'right' : 'left';

    return `
      <div style="direction: ${direction}; font-family: Arial, sans-serif; min-width: 250px; text-align: ${textAlign};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0; color: #2c3e50; cursor: pointer; text-decoration: underline;" onclick="window.openDonorDetails('${donorData.donor.id}')">
            ${donorData.donor.lastAndFirstName}
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

        <div style="margin-bottom: 8px;" dir="ltr">
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
            <span><strong>💰 <a href="javascript:void(0)" onclick="window.openDonorDonations('${donorData.donor.id}', '${donorData.donor.lastAndFirstName.replace(/'/g, "\\'")}')" style="color: #3498db; text-decoration: underline; cursor: pointer;">${this.i18n.terms.totalDonationsLabel}</a>:</strong></span>
            <div style="text-align: left;">
              <span>${totalDonationsDisplay}</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📊 ${this.i18n.terms.donationCountLabel}:</strong></span>
            <div style="text-align: left;">
              <span>${donorData.stats.donationCount}</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📅 ${this.i18n.terms.lastDonationLabel}:</strong></span>
            <div style="text-align: left;">
              <span>${lastDonationText}</span>
              ${lastDonationAmountDisplay ? `<div style="font-size: 11px; color: #27ae60;" title="${lastDonationAmountTitle}">${lastDonationAmountDisplay}</div>` : ''}
            </div>
          </div>
          ${donorData.stats.partnerDonationsCount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>🤝 שותף:</strong></span>
            <div style="text-align: left;">
              <span>${donorData.stats.partnerDonationsCount} תרומות</span>
              <div style="font-size: 11px; color: #7f8c8d;">(סה"כ: ${donorData.stats.partnerDonationsCurrencySymbol}${donorData.stats.partnerDonationsTotal.toLocaleString()})</div>
            </div>
          </div>
          ` : ''}
          ${donorData.stats.commitmentCount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span><strong>📝 התחייבויות:</strong></span>
            <div style="text-align: left;">
              <span>${donorData.stats.commitmentCount}</span>
              <div style="font-size: 11px; color: #7f8c8d;" title="שולם בפועל / סה&quot;כ התחייבות">(${commitmentDisplay})</div>
            </div>
          </div>
          ` : ''}
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

    // Trigger change detection
    this.cdr.detectChanges();

    // Use requestAnimationFrame to ensure DOM updates are complete
    requestAnimationFrame(() => {
      // Wait for sidebar animation and DOM reflow
      setTimeout(() => {
        if (this.map) {
          // Trigger Google Maps resize
          google.maps.event.trigger(this.map, 'resize');

          // Re-fit to bounds if we have markers
          if (this.markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => bounds.extend(marker.getPosition()!));
            this.map.fitBounds(bounds);
          }
        }
      }, 350);
    });
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
      // Preserve map position after reload (don't fitBounds)
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(async () => {
        this.preserveMapView = true;
        await this.loadData();
        const marker = this.getMarkerOf(donorId);
        if (marker) {
          this.onMarkerClick(donorId, marker);
        }
      });
    }
  }

  async addDonationForDonor(donorId: string) {
    // Open donation modal directly with pre-selected donor
    const changed = await this.ui.donationDetailsDialog('new', { donorId });
    if (changed) {
      // Preserve map position after reload (don't fitBounds)
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(async () => {
        this.preserveMapView = true;
        await this.loadData();
        // Re-open info window for this donor after reload
        const marker = this.getMarkerOf(donorId);
        if (marker) {
          this.onMarkerClick(donorId, marker);
        }
      });
    }
  }

  async openDonorDonations(donorId: string, donorName: string) {
    await this.ui.donorDonationsDialog(donorId, 'donations', donorName);
  }

  async togglePolygonMode() {
    this.isPolygonMode = !this.isPolygonMode;

    if (!this.isPolygonMode) {
      // If turning off and we have points, close the polygon
      if (this.currentPolygonPoints.length >= 3) {
        await this.closePolygon();
      } else {
        // Just clear if less than 3 points
        this.clearPolygonDrawing();
      }
    } else {
      // Show instructions
      this.ui.info('לחץ על המפה כדי להתחיל לצייר פוליגון. כבה את הכפתור או לחץ על הנקודה האדומה לסיום.');
    }
  }

  clearPolygonDrawing() {
    this.currentPolygonPoints = [];
    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
      this.tempPolyline = undefined;
    }
    if (this.drawnPolygon) {
      this.drawnPolygon.setMap(null);
      this.drawnPolygon = undefined;
    }
  }

  handlePolygonClick(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return;

    const clickedPoint = e.latLng;

    // Check if clicked near the first point to close the polygon
    if (this.currentPolygonPoints.length >= 3) {
      const firstPoint = this.currentPolygonPoints[0];
      const distance = google.maps.geometry?.spherical?.computeDistanceBetween(firstPoint, clickedPoint) ||
        this.computeDistance(firstPoint, clickedPoint);

      // If within 100 meters of first point, close the polygon
      if (distance < 100) {
        this.closePolygon();
        return;
      }
    }

    // Add point to polygon
    this.currentPolygonPoints.push(clickedPoint);

    // Update visual representation
    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
    }

    // Draw polyline connecting all points
    this.tempPolyline = new google.maps.Polyline({
      path: this.currentPolygonPoints,
      strokeColor: '#3498db',
      strokeWeight: 3,
      strokeOpacity: 0.7,
      map: this.map
    });

    // Show instruction after first point
    if (this.currentPolygonPoints.length === 1) {
      this.ui.info('המשך לסמן נקודות. לחץ על הנקודה הראשונה או כבה את מצב הפוליגון לסיום.');
    }
  }

  // Helper function to compute distance without geometry library
  private computeDistance(p1: google.maps.LatLng, p2: google.maps.LatLng): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = p1.lat() * Math.PI / 180;
    const lat2 = p2.lat() * Math.PI / 180;
    const deltaLat = (p2.lat() - p1.lat()) * Math.PI / 180;
    const deltaLng = (p2.lng() - p1.lng()) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async closePolygon() {
    if (this.currentPolygonPoints.length < 3) {
      this.ui.error('יש צורך לפחות ב-3 נקודות כדי ליצור פוליגון');
      return;
    }

    // Save polygon points for later use
    const polygonPoints = this.currentPolygonPoints.map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));

    // Create polygon
    const polygon = new google.maps.Polygon({
      paths: this.currentPolygonPoints,
      strokeColor: '#3498db',
      strokeWeight: 2,
      strokeOpacity: 0.8,
      fillColor: '#3498db',
      fillOpacity: 0.2,
      map: this.map
    });

    // Clear temporary drawing
    this.clearPolygonDrawing();

    // Store the polygon temporarily
    this.drawnPolygon = polygon;

    // Find donors inside polygon (now async)
    const donorsInPolygon = await this.findDonorsInPolygon(polygon);

    // Exit polygon mode
    this.isPolygonMode = false;

    // Show modal with donors and polygon points
    if (donorsInPolygon.length > 0) {
      await this.showDonorsInPolygonModal(donorsInPolygon, polygonPoints);
    } else {
      this.ui.info('לא נמצאו תורמים בתוך הפוליגון שנבחר');
    }

    // Remove polygon from map
    polygon.setMap(null);
  }

  async findDonorsInPolygon(polygon: google.maps.Polygon): Promise<DonorMapData[]> {
    const donorIdsInside: string[] = [];

    // Find markers inside polygon (lightweight check)
    for (const marker of this.markersData) {
      const point = new google.maps.LatLng(marker.lat, marker.lng);

      // Check if point is inside polygon
      if (google.maps.geometry?.poly?.containsLocation(point, polygon) ||
          this.isPointInPolygonManual(point, polygon)) {
        donorIdsInside.push(marker.donorId);
      }
    }

    // Load full data only for donors inside polygon
    if (donorIdsInside.length === 0) {
      return [];
    }

    // @ts-ignore - remult metadata not updated yet
    const donorsData = await DonorMapController.loadDonorsMapDataByIds(donorIdsInside);
    return donorsData;
  }

  // Manual point-in-polygon check (ray casting algorithm)
  private isPointInPolygonManual(point: google.maps.LatLng, polygon: google.maps.Polygon): boolean {
    const path = polygon.getPath();
    const polygonPoints: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const p = path.getAt(i);
      polygonPoints.push({ lat: p.lat(), lng: p.lng() });
    }

    let inside = false;
    const x = point.lng();
    const y = point.lat();

    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].lng;
      const yi = polygonPoints[i].lat;
      const xj = polygonPoints[j].lng;
      const yj = polygonPoints[j].lat;

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  async showDonorsInPolygonModal(donors: DonorMapData[], polygonPoints: { lat: number; lng: number }[]) {
    // Show the modal with selected donors and polygon points
    const result = await this.ui.mapSelectedDonorsDialog(donors, polygonPoints);

    // Handle route request from modal
    if (result?.action === 'showRoute' && result.donors?.length >= 2) {
      await this.calculateRouteForSelectedDonors(result.donors);
    }
  }

  // Calculate route for specific donors (from polygon selection modal)
  async calculateRouteForSelectedDonors(donors: DonorMapData[]) {
    console.log('[Route] calculateRouteForSelectedDonors called with', donors.length, 'donors');

    // Create a map of donor IDs for quick lookup
    const selectedDonorIds = new Set(donors.map(d => d.donor.id));
    console.log('[Route] Selected donor IDs:', Array.from(selectedDonorIds));
    console.log('[Route] Current markersData count:', this.markersData.length);
    console.log('[Route] First 3 markersData:', this.markersData.slice(0, 3).map(m => ({ id: m.donorId, lat: m.lat, lng: m.lng })));

    // Get coordinates from the ORIGINAL markersData (which has correct lat/lng from the map)
    // Don't use donorPlace.place coordinates as they may have relation issues
    const routeMarkers: MarkerData[] = this.markersData
      .filter(m => selectedDonorIds.has(m.donorId))
      .map(m => {
        // Find the donor data to get the name and statuses
        const donorData = donors.find(d => d.donor.id === m.donorId);
        return {
          donorId: m.donorId,
          lat: m.lat,
          lng: m.lng,
          donorName: donorData?.donor.lastAndFirstName || m.donorName,
          statuses: donorData?.stats.statuses || m.statuses
        };
      });

    console.log('[Route] Filtered routeMarkers count:', routeMarkers.length);
    console.log('[Route] Created routeMarkers (JSON):', JSON.stringify(routeMarkers.map(m => ({ name: m.donorName, lat: m.lat, lng: m.lng }))));

    if (routeMarkers.length < 2) {
      this.ui.error('יש צורך לפחות ב-2 תורמים עם קואורדינטות לחישוב מסלול');
      return;
    }

    // Set markersData to selected donors for route calculation
    this.markersData = routeMarkers;

    // Clear existing markers and create new ones for route donors
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    routeMarkers.forEach(m => {
      const marker = this.createGoogleMarker(m);
      this.markers.push(marker);
    });

    // Fit map to show all route markers
    const bounds = new google.maps.LatLngBounds();
    routeMarkers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
    this.map.fitBounds(bounds);

    // Start route calculation
    await this.chooseStartPoint();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Control') {
      this.isCtrlPressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Control') {
      this.isCtrlPressed = false;
    }
  };

  async onMapClick(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    console.log('Map clicked at:', lat, lng);

    // Handle polygon drawing mode
    if (this.isPolygonMode) {
      this.handlePolygonClick(e);
      return;
    }

    // Require Ctrl+Click to create new donor
    if (!this.isCtrlPressed) {
      return;
    }

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

        const shouldCreate = await this.ui.yesNoQuestion(message, true);

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
        countryEntity = await this.countryRepo.findFirst({
          code: countryCode
        });

        if (!countryEntity) {
          console.warn(`Country with code ${countryCode} not found, creating new...`);
          const countryName = placeDto.countryName || placeDto.country || countryCode;
          countryEntity = await this.countryRepo.insert({
            name: countryName,
            nameEn: countryName,
            code: countryCode.toUpperCase(),
            phonePrefix: '',
            currencyId: 'USD',
            isActive: true
          });
        }
      } catch (error) {
        console.error('Error loading/creating country:', error);
      }

      // יצירת ושמירת Place במסד הנתונים לפני פתיחת פרטי התורם
      const placeData: Partial<Place> = {
        placeId: geocodeResult.placeId,
        fullAddress: geocodeResult.formattedAddress || '',
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

      console.log('Creating and saving Place to database:', placeData);

      // שמירת ה-Place במסד הנתונים מיד
      const savedPlace = await Place.findOrCreate(placeData, this.placeRepo);
      console.log('Place saved successfully with ID:', savedPlace.id);

      // פתיחת דיאלוג תורם חדש עם ה-Place השמור
      const changed = await this.ui.donorDetailsDialog('new', { initialPlace: savedPlace });

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

  // ==================== Route Optimization ====================

  async startRouteOptimization() {
    if (this.isRouteActive) {
      this.clearRoute();
      return;
    }

    if (this.markers.length < 2) {
      this.ui.error(this.i18n.terms.noMarkersForRoute);
      return;
    }

    // Block if > 20 markers
    if (this.markers.length > 20) {
      this.ui.error(this.i18n.terms.routeTooManyPoints);
      return;
    }

    await this.chooseStartPoint();
  }

  async chooseStartPoint() {
    const options: { caption: string; id: string; lat?: number; lng?: number }[] = [
      { caption: `📍 ${this.i18n.terms.myLocation}`, id: '__my_location__' }
    ];

    // Add all donors on the map as start point options
    this.markersData.forEach(m => {
      options.push({ caption: `👤 ${m.donorName}`, id: m.donorId, lat: m.lat, lng: m.lng });
    });

    // Capture selection synchronously, then handle async work after dialog closes
    let selectedOption: { id: string; lat?: number; lng?: number } | null = null;

    await this.ui.selectValuesDialog({
      values: options,
      title: this.i18n.terms.chooseStartPoint,
      onSelect: (selected) => {
        selectedOption = selected;
      }
    });

    if (!selectedOption) return;

    if ((selectedOption as any).id === '__my_location__') {
      // Get user location
      if (this.userLat !== null && this.userLng !== null) {
        await this.calculateOptimizedRoute({ lat: this.userLat, lng: this.userLng });
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          this.showUserLocationMarker();
          await this.calculateOptimizedRoute({ lat: this.userLat, lng: this.userLng });
        } catch {
          this.ui.error('לא ניתן לקבל מיקום. בחר תורם כנקודת התחלה.');
        }
      }
    } else {
      const donor = this.markersData.find(m => m.donorId === (selectedOption as any).id);
      if (donor) {
        await this.calculateOptimizedRoute({ lat: donor.lat, lng: donor.lng });
      }
    }
  }

  async calculateOptimizedRoute(startPoint: { lat: number; lng: number }) {
    console.log('[Route] calculateOptimizedRoute called with startPoint:', startPoint);
    console.log('[Route] markersData count:', this.markersData.length);

    // שמור את נקודת ההתחלה לשימוש בשמירת קהל יעד
    this.routeStartPoint = startPoint;
    this.calculatingRoute = true;
    this.cdr.detectChanges();

    try {
      // Use new Routes API: google.maps.routes.Route.computeRoutes
      const { Route } = await google.maps.importLibrary('routes') as any;

      const origin = new google.maps.LatLng(startPoint.lat, startPoint.lng);
      const destination = origin; // Round trip

      // All markers as intermediates
      const intermediates = this.markersData.map(m => ({
        location: new google.maps.LatLng(m.lat, m.lng)
      }));

      console.log('[Route] Intermediates count:', intermediates.length);

      const request = {
        origin,
        destination,
        intermediates,
        travelMode: 'DRIVING' as any,
        optimizeWaypointOrder: true,
        fields: ['path', 'legs', 'optimizedIntermediateWaypointIndices', 'distanceMeters', 'durationMillis']
      };

      console.log('[Route] Request:', JSON.stringify(request, null, 2));

      const { routes } = await Route.computeRoutes(request);

      console.log('[Route] Response routes count:', routes?.length);
      console.log('[Route] First route:', routes?.[0]);

      if (!routes || routes.length === 0) {
        throw new Error('No route found');
      }

      this.renderRoute(routes[0]);
    } catch (err) {
      console.error('[Route] Route calculation failed:', err);
      this.ui.error(this.i18n.terms.routeCalculationFailed);
    } finally {
      this.calculatingRoute = false;
      this.cdr.detectChanges();
    }
  }

  renderRoute(route: any) {
    console.log('[Route] renderRoute called');
    console.log('[Route] route object:', route);
    console.log('[Route] route.legs:', route.legs);
    console.log('[Route] route.optimizedIntermediateWaypointIndices:', route.optimizedIntermediateWaypointIndices);
    console.log('[Route] route.createPolylines exists:', typeof route.createPolylines === 'function');

    // Clear previous polylines
    this.routePolylines.forEach(p => p.setMap(null));
    this.routePolylines = [];

    // Draw polylines using createPolylines()
    try {
      const polylines = route.createPolylines({
        polylineOptions: {
          map: this.map,
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.8,
          zIndex: 1
        }
      });
      this.routePolylines = polylines || [];
      console.log('[Route] Created polylines count:', this.routePolylines.length);

      // Extract polyline path for saving to DB
      this.savedRoutePolylinePath = [];
      if (this.routePolylines.length > 0) {
        const path = this.routePolylines[0].getPath();
        path.forEach((point: google.maps.LatLng) => {
          this.savedRoutePolylinePath.push({ lat: point.lat(), lng: point.lng() });
        });
      }
    } catch (err) {
      console.error('[Route] Error creating polylines:', err);
    }

    // Get optimized waypoint order
    const waypointOrder: number[] = route.optimizedIntermediateWaypointIndices || [];
    console.log('[Route] waypointOrder:', waypointOrder);
    console.log('[Route] markersData length:', this.markersData.length);

    // Build route stops in optimized order
    this.routeStops = waypointOrder.map((originalIndex: number, orderIndex: number) => ({
      marker: this.markersData[originalIndex],
      visited: false,
      order: orderIndex + 1
    }));

    console.log('[Route] routeStops:', this.routeStops.map(s => ({ order: s.order, name: s.marker?.donorName, lat: s.marker?.lat, lng: s.marker?.lng })));

    // Hide original markers
    this.markers.forEach(marker => marker.setVisible(false));

    // Create numbered route markers
    this.routeMarkers.forEach(m => m.setMap(null));
    this.routeMarkers = [];

    this.routeStops.forEach(stop => {
      const marker = new google.maps.Marker({
        position: { lat: stop.marker.lat, lng: stop.marker.lng },
        map: this.map,
        title: `${stop.order}. ${stop.marker.donorName}`,
        icon: this.createNumberedMarkerIcon(stop.order, false),
        zIndex: 200 - stop.order
      });
      marker.addListener('click', async () => {
        await this.onMarkerClick(stop.marker.donorId, marker);
      });
      this.routeMarkers.push(marker);
    });

    // Calculate totals from legs
    let totalDistance = 0;
    let totalDuration = 0;
    this.routeLegs = [];
    this.savedRouteLegsData = []; // For saving to DB

    const legs = route.legs || [];
    legs.forEach((leg: any, i: number) => {
      const distMeters = leg.distanceMeters || 0;
      const durMillis = leg.durationMillis || 0;
      totalDistance += distMeters;
      totalDuration += durMillis;

      // Save leg data for DB
      this.savedRouteLegsData.push({
        distanceMeters: distMeters,
        durationSeconds: Math.round(durMillis / 1000)
      });

      if (i < this.routeStops.length) {
        this.routeLegs.push({
          distance: distMeters >= 1000
            ? `${(distMeters / 1000).toFixed(1)} ק"מ`
            : `${distMeters} מ'`,
          duration: this.formatDuration(Math.round(durMillis / 1000)),
          donorName: this.routeStops[i].marker.donorName
        });
      }
    });

    this.routeTotalDistance = totalDistance >= 1000
      ? `${(totalDistance / 1000).toFixed(1)} ק"מ`
      : `${totalDistance} מ'`;
    this.routeTotalDuration = this.formatDuration(Math.round(totalDuration / 1000));

    // Save totals for DB
    this.savedRouteTotalDistanceMeters = totalDistance;
    this.savedRouteTotalDurationSeconds = Math.round(totalDuration / 1000);

    this.isRouteActive = true;
    this.cdr.detectChanges();
  }

  clearRoute() {
    // Remove polylines
    this.routePolylines.forEach(p => p.setMap(null));
    this.routePolylines = [];

    // Remove route markers
    this.routeMarkers.forEach(m => m.setMap(null));
    this.routeMarkers = [];

    // Show original markers again
    this.markers.forEach(marker => marker.setVisible(true));

    // Reset state
    this.isRouteActive = false;
    this.routeStops = [];
    this.routeLegs = [];
    this.routeTotalDistance = '';
    this.routeTotalDuration = '';
    this.savedTargetAudienceName = '';
    this.cdr.detectChanges();
  }

  // Save route donors as target audience
  async saveRouteAsTargetAudience() {
    if (!this.routeStops || this.routeStops.length === 0) {
      this.ui.error('אין עצירות במסלול לשמירה');
      return;
    }

    // Get donor IDs from route stops
    const donorIds = this.routeStops.map(stop => stop.marker.donorId);

    // Load full donor data for saving
    // @ts-ignore
    const donorsData = await DonorMapController.loadDonorsMapDataByIds(donorIds);

    // Calculate metadata
    const totalDonations = donorsData.reduce((sum: number, d: any) => sum + (d.stats?.totalDonations || 0), 0);
    const donorCount = donorsData.length;

    const metadata = {
      source: 'map_route',
      totalDonations,
      averageDonation: donorCount > 0 ? totalDonations / donorCount : 0,
      createdFrom: 'Route Selection',
      routeDistance: this.routeTotalDistance,
      routeDuration: this.routeTotalDuration
    };

    // Build route data to save with target audience (includes full polyline path!)
    const routeData = this.routeStartPoint ? {
      startPoint: this.routeStartPoint,
      waypointOrder: donorIds, // Already in optimized order from routeStops
      calculatedAt: new Date().toISOString(),
      // Save full route data from Google - no need to call API again when loading!
      polylinePath: this.savedRoutePolylinePath,
      totalDistanceMeters: this.savedRouteTotalDistanceMeters,
      totalDurationSeconds: this.savedRouteTotalDurationSeconds,
      legs: this.savedRouteLegsData
    } : undefined;

    // Open TargetAudienceDetailsModal
    const result = await this.ui.targetAudienceDetailsDialog('new', {
      initialDonors: donorsData,
      metadata,
      routeData
    });

    if (result) {
      // שמור את שם קהל היעד להצגה במקום הכפתור
      this.savedTargetAudienceName = result.name || 'קהל יעד';
      this.ui.info('קהל היעד נשמר בהצלחה');
    }
  }

  openWazeForStop(stop: { marker: MarkerData; visited: boolean; order: number }) {
    window.open(`https://waze.com/ul?ll=${stop.marker.lat},${stop.marker.lng}&navigate=yes`, '_blank');
    stop.visited = true;

    // Update marker icon
    const stopIndex = this.routeStops.indexOf(stop);
    if (stopIndex >= 0 && stopIndex < this.routeMarkers.length) {
      this.routeMarkers[stopIndex].setIcon(this.createNumberedMarkerIcon(stop.order, true));
    }
    this.cdr.detectChanges();
  }

  createNumberedMarkerIcon(num: number, visited: boolean): any {
    const color = visited ? '#10b981' : '#667eea';
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.1 27.9 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="18" cy="16" r="12" fill="white" opacity="0.25"/>
          <text x="18" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial">${num}</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(36, 44)
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} שע' ${minutes} דק'`;
    }
    return `${minutes} דק'`;
  }

  get visitedStopsCount(): number {
    return this.routeStops.filter(s => s.visited).length;
  }

  // ==================== End Route Optimization ====================

  ngOnDestroy() {
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

    // Clear route
    this.clearRoute();

    // Clear user location marker
    if (this.userLocationMarker) {
      this.userLocationMarker.setMap(null);
    }

    // Clear markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Clear polygon drawings
    this.clearPolygonDrawing();

    // Clean up subscriptions
    this.subscription.unsubscribe();

    // Clean up global functions
    delete (window as any).openDonorDetails;
    delete (window as any).addDonationForDonor;
    delete (window as any).openDonorDonations;
  }
}
