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

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-donors-map',
  templateUrl: './donors-map.component.html',
  styleUrls: ['./donors-map.component.scss']
})
export class DonorsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private subscription = new Subscription();

  donors: Donor[] = [];
  donations: Donation[] = [];

  // Maps for related data from dedicated entities
  donorPlaceMap = new Map<string, Place>();
  donorEmailMap = new Map<string, string>();
  donorPhoneMap = new Map<string, string>();
  donorFullAddressMap = new Map<string, string>();

  // Stats maps
  donorTotalDonationsMap = new Map<string, number>();
  donorAverageDonationMap = new Map<string, number>();
  donorLastDonationDateMap = new Map<string, Date | null>();
  donorDonationCountMap = new Map<string, number>();
  donorStatusMap = new Map<string, 'active' | 'inactive' | 'high-donor' | 'recent-donor'>();

  loading = false;
  showSummary = true;

  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);

  constructor(
    private geocodingService: GeocodingService,
    public i18n: I18nService,
    private router: Router,
    private ui: UIToolsService,
    private donorService: DonorService,
    private filterService: GlobalFilterService,
    private geoService: GeoService,
    private cdr: ChangeDetectorRef
  ) { }

  // Note: DonorService already injected above for findFiltered()

  // סטטיסטיקות
  get totalDonors(): number {
    return this.donors.length;
  }

  get activeDonors(): number {
    return this.donors.filter(d => d.isActive).length;
  }

  get averageDonation(): number {
    if (this.donors.length === 0) return 0;
    const totalAmount = this.donors.reduce((sum, d) => sum + (this.donorTotalDonationsMap.get(d.id) || 0), 0);
    const totalCount = this.donors.reduce((sum, d) => sum + (this.donorDonationCountMap.get(d.id) || 0), 0);
    return totalCount > 0 ? totalAmount / totalCount : 0;
  }

  get donorsOnMap(): number {
    return this.donors.filter(d => {
      const place = this.donorPlaceMap.get(d.id);
      return place?.latitude && place?.longitude;
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
      await Promise.all([
        this.loadDonors(),
        this.loadDonations()
      ]);
      this.calculateDonorStats();

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

  async loadDonors() {
    // Use DonorService which automatically applies global filters
    const currentFilters = this.filterService.currentFilters;
    console.log('DonorsMap: Loading donors with filters:', currentFilters);

    const baseDonors = await this.donorService.findFiltered();

    // Use DonorService to load all related data
    const relatedData = await this.donorService.loadDonorRelatedData(
      baseDonors.map(d => d.id)
    );

    // Populate maps from service
    this.donorPlaceMap = relatedData.donorPlaceMap;
    this.donorEmailMap = relatedData.donorEmailMap;
    this.donorPhoneMap = relatedData.donorPhoneMap;
    this.donorFullAddressMap = relatedData.donorFullAddressMap;
    // Note: birthDate not needed for donors-map

    this.donors = baseDonors;

    console.log('DonorsMap: Loaded donors:', this.donors.length);
    console.log('DonorsMap: Donors with locations:', this.donors.filter(d => {
      const place = this.donorPlaceMap.get(d.id);
      return place?.latitude && place?.longitude;
    }).length);
  }

  async loadDonations() {
    this.donations = await this.donationRepo.find({
      include: {
        donor: true
      }
    });
  }

  calculateDonorStats() {
    // Clear existing stats
    this.donorDonationCountMap.clear();
    this.donorTotalDonationsMap.clear();
    this.donorAverageDonationMap.clear();
    this.donorLastDonationDateMap.clear();
    this.donorStatusMap.clear();

    this.donors.forEach(donor => {
      const donorDonations = this.donations.filter(d => d.donorId === donor.id);

      const donationCount = donorDonations.length;
      const totalDonations = donorDonations.reduce((sum, d) => sum + d.amount, 0);
      const averageDonation = donationCount > 0 ? totalDonations / donationCount : 0;

      this.donorDonationCountMap.set(donor.id, donationCount);
      this.donorTotalDonationsMap.set(donor.id, totalDonations);
      this.donorAverageDonationMap.set(donor.id, averageDonation);

      // מצא תאריך תרומה אחרונה
      const sortedDonations = donorDonations.sort((a, b) =>
        new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime()
      );
      const lastDonationDate = sortedDonations.length > 0 ? sortedDonations[0].donationDate : null;
      this.donorLastDonationDateMap.set(donor.id, lastDonationDate);

      // קבע סטטוס לפי קריטריונים
      const status = this.determineDonorStatus(donor.id);
      this.donorStatusMap.set(donor.id, status);
    });
  }

  determineDonorStatus(donorId: string): 'active' | 'inactive' | 'high-donor' | 'recent-donor' {
    const donor = this.donors.find(d => d.id === donorId);
    if (!donor || !donor.isActive) return 'inactive';

    const totalDonations = this.donorTotalDonationsMap.get(donorId) || 0;
    const lastDonationDate = this.donorLastDonationDateMap.get(donorId);

    // תורם גדול - מעל 10,000 שקלים בסך הכל
    if (totalDonations > 10000) return 'high-donor';

    // תרם לאחרונה - תרם בחודשים האחרונים
    if (lastDonationDate) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (new Date(lastDonationDate) > threeMonthsAgo) {
        return 'recent-donor';
      }
    }

    return 'active';
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
      this.markersLayer = L.layerGroup().addTo(this.map);

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

    console.log('Adding markers for donors:', this.donors.length);
    console.log('Donors with coordinates:', this.donors.filter(d => {
      const place = this.donorPlaceMap.get(d.id);
      return place?.latitude && place?.longitude;
    }).length);

    let addedCount = 0;
    this.donors.forEach((donor, index) => {
      const place = this.donorPlaceMap.get(donor.id);
      if (place?.latitude && place?.longitude) {
        console.log(`Adding marker ${index + 1}:`, donor.displayName, place.latitude, place.longitude);
        try {
          const marker = this.createMarkerForDonor(donor);
          this.markersLayer.addLayer(marker);
          addedCount++;
        } catch (error) {
          console.error('Error creating marker for donor:', donor.displayName, error);
        }
      } else {
        console.log(`No coordinates for donor ${index + 1}:`, donor.displayName);
      }
    });

    console.log('Total markers added:', addedCount);
    console.log('Markers layer count:', this.markersLayer.getLayers().length);

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

  createMarkerForDonor(donor: Donor): L.Marker {
    const status = this.donorStatusMap.get(donor.id) || 'active';
    const color = this.getMarkerColor(status);
    const place = this.donorPlaceMap.get(donor.id);

    if (!place?.latitude || !place?.longitude) {
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

    const marker = L.marker([place.latitude, place.longitude], {
      icon: customIcon
    });

    // הוסף חלונית popup עם פרטי התורם
    const popupContent = this.createPopupContent(donor);
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

  createPopupContent(donor: Donor): string {
    const lastDonationDate = this.donorLastDonationDateMap.get(donor.id);
    const lastDonationText = lastDonationDate
      ? new Date(lastDonationDate).toLocaleDateString(this.i18n.lang.RTL ? 'he-IL' : 'en-US')
      : this.i18n.terms.noDataAvailable;

    const fullAddress = this.donorFullAddressMap.get(donor.id);
    const primaryEmail = this.donorEmailMap.get(donor.id);
    const primaryPhone = this.donorPhoneMap.get(donor.id);
    const totalDonations = this.donorTotalDonationsMap.get(donor.id) || 0;
    const donationCount = this.donorDonationCountMap.get(donor.id) || 0;
    const averageDonation = this.donorAverageDonationMap.get(donor.id) || 0;

    const direction = this.i18n.lang.RTL ? 'rtl' : 'ltr';
    const textAlign = this.i18n.lang.RTL ? 'right' : 'left';

    return `
      <div style="direction: ${direction}; font-family: Arial, sans-serif; min-width: 250px; text-align: ${textAlign};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="margin: 0; color: #2c3e50; cursor: pointer; text-decoration: underline;" onclick="window.openDonorDetails('${donor.id}')">
            ${donor.displayName}
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
          " onclick="window.addDonationForDonor('${donor.id}')" onmouseover="this.style.backgroundColor='#229954'" onmouseout="this.style.backgroundColor='#27ae60'">
            + הוסף תרומה
          </button>
        </div>

        <div style="border-bottom: 2px solid #3498db; margin-bottom: 10px;"></div>

        <div style="margin-bottom: 8px;">
          <strong>📍 ${this.i18n.terms.addressLabel}:</strong><br>
          ${fullAddress || this.i18n.terms.notSpecifiedAddress}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📧 ${this.i18n.terms.emailLabel}:</strong> ${primaryEmail || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📞 ${this.i18n.terms.phoneLabel}:</strong> ${primaryPhone || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>💰 ${this.i18n.terms.totalDonationsLabel}:</strong></span>
            <span>₪${totalDonations.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📊 ${this.i18n.terms.donationCountLabel}:</strong></span>
            <span>${donationCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📈 ${this.i18n.terms.averageDonationLabel}:</strong></span>
            <span>₪${averageDonation.toLocaleString()}</span>
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

  // Legacy method - keeping for reference (not used anymore)
  async geocodeMissingAddresses_OLD() {
    const donorsWithoutCoords = this.donors.filter(d => {
      const place = this.donorPlaceMap.get(d.id);
      const fullAddress = this.donorFullAddressMap.get(d.id);
      return !place?.latitude && !place?.longitude && fullAddress && fullAddress.trim() !== '';
    });

    if (donorsWithoutCoords.length === 0) {
      alert(this.i18n.terms.allDonorsHaveCoordinates);
      return;
    }

    this.loading = true;
    let updatedCount = 0;

    for (const donor of donorsWithoutCoords) {
      try {
        const fullAddress = this.donorFullAddressMap.get(donor.id);
        const place = this.donorPlaceMap.get(donor.id);

        if (!fullAddress) continue;

        const coords = await this.geocodingService.geocodeAddress(
          fullAddress,
          place?.city || '',
          place?.country?.name || ''
        );

        if (coords && place) {
          place.latitude = coords.latitude;
          place.longitude = coords.longitude;

          // Save the updated place to database
          try {
            const placeRepo = remult.repo(Place);
            await placeRepo.save(place);
            updatedCount++;
          } catch (error) {
            console.error(`Error saving place for ${donor.displayName}:`, error);
          }
        }

        // הוסף delay קטן כדי לא להעמיס על השרת
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error geocoding address for ${donor.displayName}:`, error);
      }
    }

    this.loading = false;
    const message = this.i18n.terms.convertedAddresses
      .replace('{count}', updatedCount.toString())
      .replace('{total}', donorsWithoutCoords.length.toString());
    alert(message);

    if (updatedCount > 0) {
      this.addMarkersToMap();
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
      // Reload donations if needed to refresh the map data
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(async () => {
        await this.loadDonations();
        this.calculateDonorStats();
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

      const savedPlace = await Place.findOrCreate(placeData, remult.repo(Place));

      // טעינה מחדש של Place עם country relation
      const place = await remult.repo(Place).findId(savedPlace.id, {
        include: { country: true }
      });

      // פתיחת דיאלוג תורם חדש עם המקום
      const changed = await this.ui.donorDetailsDialog('new', { initialPlace: place || savedPlace });

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
