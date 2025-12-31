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
import { User } from '../../../shared/entity/user';
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

  // Flag to track if map settings were loaded (one-time operation)
  private mapSettingsLoaded = false;

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
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  addMarkersToMap() {
    if (!this.map) {
      console.log('Map not ready');
      return;
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

    // Fit map to markers bounds if there are any markers
    if (addedCount > 0) {
      this.map.fitBounds(bounds);

      // Don't zoom in too much if there's only one marker
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom()! > 15) {
          this.map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }

  /**
   * Create a Google Maps marker for a donor
   */
  createGoogleMarker(markerData: MarkerData): google.maps.Marker {
    const color = this.getMarkerColor(markerData.status);

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
    await this.ui.mapSelectedDonorsDialog(donors, polygonPoints);
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

  ngOnDestroy() {
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);

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
  }
}
