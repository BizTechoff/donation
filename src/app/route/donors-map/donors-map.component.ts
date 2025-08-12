import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { remult } from 'remult';
import * as L from 'leaflet';
import { Donor } from '../../../shared/entity/donor';
import { Donation } from '../../../shared/entity/donation';
import { GeocodingService } from '../../services/geocoding.service';
import { I18nService } from '../../i18n/i18n.service';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

interface DonorWithStats extends Donor {
  totalDonations: number;
  averageDonation: number;
  lastDonationDate: Date | null;
  donationCount: number;
  status: 'active' | 'inactive' | 'high-donor' | 'recent-donor';
}

@Component({
  selector: 'app-donors-map',
  templateUrl: './donors-map.component.html',
  styleUrls: ['./donors-map.component.scss']
})
export class DonorsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) mapElement!: ElementRef;

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  
  donors: DonorWithStats[] = [];
  donations: Donation[] = [];
  
  loading = false;
  showSummary = true;
  
  donorRepo = remult.repo(Donor);
  donationRepo = remult.repo(Donation);

  constructor(
    private geocodingService: GeocodingService,
    public i18n: I18nService
  ) {}

  // סטטיסטיקות
  get totalDonors(): number {
    return this.donors.length;
  }

  get activeDonors(): number {
    return this.donors.filter(d => d.isActive).length;
  }

  get averageDonation(): number {
    if (this.donors.length === 0) return 0;
    const totalAmount = this.donors.reduce((sum, d) => sum + d.totalDonations, 0);
    const totalCount = this.donors.reduce((sum, d) => sum + d.donationCount, 0);
    return totalCount > 0 ? totalAmount / totalCount : 0;
  }

  get donorsOnMap(): number {
    return this.donors.filter(d => d.latitude && d.longitude).length;
  }

  async ngOnInit() {
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

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  async loadData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDonors(),
        this.loadDonations()
      ]);
      this.calculateDonorStats();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDonors() {
    this.donors = await this.donorRepo.find({
      orderBy: { lastName: 'asc' }
    }) as DonorWithStats[];
    
    // Add demo coordinates for testing - more extensive data
    if (this.donors.length > 0) {
      const demoCoords = [
        { lat: 40.7128, lng: -74.0060 }, // New York
        { lat: 34.0522, lng: -118.2437 }, // Los Angeles
        { lat: 41.8781, lng: -87.6298 }, // Chicago
        { lat: 29.7604, lng: -95.3698 }, // Houston
        { lat: 33.4484, lng: -112.0740 }, // Phoenix
        { lat: 39.9526, lng: -75.1652 }, // Philadelphia
        { lat: 29.4241, lng: -98.4936 }, // San Antonio
        { lat: 32.7767, lng: -96.7970 }, // Dallas
        { lat: 37.3382, lng: -121.8863 }, // San Jose
        { lat: 30.2672, lng: -97.7431 }, // Austin
        { lat: 30.3322, lng: -81.6557 }, // Jacksonville
        { lat: 37.7749, lng: -122.4194 }, // San Francisco
        { lat: 39.7391, lng: -104.9847 }, // Denver
        { lat: 47.6062, lng: -122.3321 }, // Seattle
        { lat: 38.9072, lng: -77.0369 }, // Washington DC
        { lat: 42.3601, lng: -71.0589 }, // Boston
        { lat: 36.1627, lng: -86.7816 }, // Nashville
        { lat: 35.2271, lng: -80.8431 }, // Charlotte
        { lat: 39.7817, lng: -86.1478 }, // Indianapolis
        { lat: 35.1495, lng: -90.0490 }, // Memphis
        { lat: 36.7478, lng: -119.7725 }, // Fresno
        { lat: 38.5816, lng: -121.4944 }, // Sacramento
        { lat: 33.7490, lng: -84.3880 }, // Atlanta
        { lat: 39.2904, lng: -76.6122 }, // Baltimore
        { lat: 25.7617, lng: -80.1918 }, // Miami
        { lat: 44.9778, lng: -93.2650 }, // Minneapolis
        { lat: 40.4406, lng: -79.9959 }, // Pittsburgh
        { lat: 41.4993, lng: -81.6944 }, // Cleveland
        { lat: 28.5383, lng: -81.3792 }, // Orlando
        { lat: 32.0835, lng: -81.0998 }, // Savannah
        { lat: 26.1224, lng: -80.1373 }, // Fort Lauderdale
        { lat: 27.9506, lng: -82.4572 }, // Tampa
        { lat: 43.0389, lng: -87.9065 }, // Milwaukee
        { lat: 39.1612, lng: -75.5264 }, // Wilmington
        { lat: 35.7796, lng: -78.6382 }, // Raleigh
        { lat: 32.7355, lng: -97.1081 }, // Arlington
        { lat: 37.4419, lng: -122.1430 }, // Palo Alto
        { lat: 33.8688, lng: -117.5931 }, // Anaheim
        { lat: 40.0583, lng: -74.4057 }, // New Brunswick
        { lat: 42.3584, lng: -71.0636 }, // Cambridge
        // Additional 25 locations for more comprehensive coverage
        { lat: 45.5152, lng: -122.6784 }, // Portland
        { lat: 36.1699, lng: -115.1398 }, // Las Vegas
        { lat: 43.6532, lng: -116.3113 }, // Boise
        { lat: 32.7555, lng: -117.2323 }, // San Diego
        { lat: 47.0379, lng: -122.9015 }, // Olympia
        { lat: 41.2033, lng: -77.1945 }, // Pennsylvania
        { lat: 44.2619, lng: -72.5806 }, // Vermont
        { lat: 44.3106, lng: -69.7795 }, // Maine
        { lat: 43.2081, lng: -71.5376 }, // New Hampshire
        { lat: 41.7658, lng: -72.6734 }, // Connecticut
        { lat: 41.6032, lng: -71.4774 }, // Rhode Island
        { lat: 42.2406, lng: -71.0275 }, // Massachusetts
        { lat: 40.5722, lng: -74.2026 }, // Staten Island
        { lat: 40.6782, lng: -73.9442 }, // Brooklyn
        { lat: 40.7831, lng: -73.9712 }, // Manhattan
        { lat: 40.7489, lng: -73.9680 }, // Queens
        { lat: 40.8448, lng: -73.8648 }, // Bronx
        { lat: 42.3398, lng: -83.0466 }, // Detroit
        { lat: 39.1031, lng: -84.5120 }, // Cincinnati
        { lat: 41.4995, lng: -81.6954 }, // Cleveland
        { lat: 43.0642, lng: -87.9073 }, // Milwaukee
        { lat: 44.9537, lng: -93.0900 }, // Saint Paul
        { lat: 46.8772, lng: -96.7898 }, // Fargo
        { lat: 41.2524, lng: -95.9980 }, // Omaha
        { lat: 39.7391, lng: -104.9847 }, // Denver
        { lat: 40.7608, lng: -111.8910 }, // Salt Lake City
        // Additional 30 locations for comprehensive coverage
        { lat: 35.0928, lng: -106.6504 }, // Albuquerque
        { lat: 33.5207, lng: -86.8025 }, // Birmingham
        { lat: 43.6150, lng: -116.2023 }, // Boise
        { lat: 42.3601, lng: -71.0589 }, // Boston
        { lat: 41.2033, lng: -77.1945 }, // State College
        { lat: 38.0293, lng: -78.4767 }, // Charlottesville
        { lat: 39.1612, lng: -75.5264 }, // Wilmington
        { lat: 41.7658, lng: -72.6734 }, // Hartford
        { lat: 43.2081, lng: -71.5376 }, // Manchester
        { lat: 44.3106, lng: -69.7795 }, // Augusta
        { lat: 42.2406, lng: -71.0275 }, // Quincy
        { lat: 41.6032, lng: -71.4774 }, // Providence
        { lat: 44.2619, lng: -72.5806 }, // Montpelier
        { lat: 43.8041, lng: -120.5542 }, // Bend
        { lat: 45.3311, lng: -121.7113 }, // Hood River
        { lat: 46.7296, lng: -117.0002 }, // Pullman
        { lat: 47.2529, lng: -122.4443 }, // Tacoma
        { lat: 48.7519, lng: -122.4787 }, // Bellingham
        { lat: 47.9779, lng: -122.2021 }, // Everett
        { lat: 46.5197, lng: -122.8746 }, // Chehalis
        { lat: 46.9804, lng: -123.8552 }, // Aberdeen
        { lat: 45.6387, lng: -121.1309 }, // The Dalles
        { lat: 44.0521, lng: -123.0868 }, // Eugene
        { lat: 42.3265, lng: -122.8756 }, // Medford
        { lat: 43.8142, lng: -103.4648 }, // Rapid City
        { lat: 46.8083, lng: -100.7837 }, // Bismarck
        { lat: 45.7833, lng: -108.5007 }, // Billings
        { lat: 47.0527, lng: -122.8652 }, // Olympia
        { lat: 46.7982, lng: -92.1077 }, // Duluth
        { lat: 44.0154, lng: -92.4699 }, // Rochester
        { lat: 43.5460, lng: -96.7313 } // Sioux Falls
      ];
      
      // Assign coordinates to all donors (overwrite existing for demo)
      this.donors.slice(0, Math.min(this.donors.length, demoCoords.length)).forEach((donor, index) => {
        if (demoCoords[index]) {
          donor.latitude = demoCoords[index].lat;
          donor.longitude = demoCoords[index].lng;
        }
      });
    }
  }

  async loadDonations() {
    this.donations = await this.donationRepo.find({
      include: {
        donor: true
      }
    });
  }

  calculateDonorStats() {
    this.donors.forEach(donor => {
      const donorDonations = this.donations.filter(d => d.donorId === donor.id);
      
      donor.donationCount = donorDonations.length;
      donor.totalDonations = donorDonations.reduce((sum, d) => sum + d.amount, 0);
      donor.averageDonation = donor.donationCount > 0 ? donor.totalDonations / donor.donationCount : 0;
      
      // מצא תאריך תרומה אחרונה
      const sortedDonations = donorDonations.sort((a, b) => 
        new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime()
      );
      donor.lastDonationDate = sortedDonations.length > 0 ? sortedDonations[0].donationDate : null;
      
      // קבע סטטוס לפי קריטריונים
      donor.status = this.determineDonorStatus(donor);
    });
  }

  determineDonorStatus(donor: DonorWithStats): 'active' | 'inactive' | 'high-donor' | 'recent-donor' {
    if (!donor.isActive) return 'inactive';
    
    // תורם גדול - מעל 10,000 שקלים בסך הכל
    if (donor.totalDonations > 10000) return 'high-donor';
    
    // תרם לאחרונה - תרם בחודשים האחרונים
    if (donor.lastDonationDate) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (new Date(donor.lastDonationDate) > threeMonthsAgo) {
        return 'recent-donor';
      }
    }
    
    return 'active';
  }

  initializeMap() {
    // מרכז המפה בארה"ב
    this.map = L.map(this.mapElement.nativeElement).setView([39.8283, -98.5795], 4);

    // הוסף שכבת מפה
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // יצירת שכבת סימנים
    this.markersLayer = L.layerGroup().addTo(this.map);

    // Force map to redraw after a short delay
    setTimeout(() => {
      if (this.map && this.map.getContainer()) {
        try {
          this.map.invalidateSize();
        } catch (error) {
          console.warn('Map initialization invalidateSize error:', error);
        }
      }
    }, 200);
  }

  addMarkersToMap() {
    if (!this.map || !this.markersLayer) {
      console.log('Map or markers layer not ready');
      return;
    }
    
    this.markersLayer.clearLayers();
    
    console.log('Adding markers for donors:', this.donors.length);
    console.log('Donors with coordinates:', this.donors.filter(d => d.latitude && d.longitude).length);
    
    let addedCount = 0;
    this.donors.forEach((donor, index) => {
      if (donor.latitude && donor.longitude) {
        console.log(`Adding marker ${index + 1}:`, donor.displayName, donor.latitude, donor.longitude);
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

  createMarkerForDonor(donor: DonorWithStats): L.Marker {
    const color = this.getMarkerColor(donor.status);
    
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

    const marker = L.marker([donor.latitude!, donor.longitude!], {
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

  createPopupContent(donor: DonorWithStats): string {
    const lastDonationText = donor.lastDonationDate 
      ? new Date(donor.lastDonationDate).toLocaleDateString(this.i18n.lang.RTL ? 'he-IL' : 'en-US')
      : this.i18n.terms.noDataAvailable;
    
    const direction = this.i18n.lang.RTL ? 'rtl' : 'ltr';
    const textAlign = this.i18n.lang.RTL ? 'right' : 'left';
    
    return `
      <div style="direction: ${direction}; font-family: Arial, sans-serif; min-width: 200px; text-align: ${textAlign};">
        <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
          ${donor.displayName}
        </h4>
        <div style="margin-bottom: 8px;">
          <strong>📍 ${this.i18n.terms.addressLabel}:</strong><br>
          ${donor.address || this.i18n.terms.notSpecifiedAddress}<br>
          ${donor.city || ''} ${donor.zipCode || ''}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📧 ${this.i18n.terms.emailLabel}:</strong> ${donor.email || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>📞 ${this.i18n.terms.phoneLabel}:</strong> ${donor.phone || this.i18n.terms.mapNotSpecified}
        </div>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>💰 ${this.i18n.terms.totalDonationsLabel}:</strong></span>
            <span>₪${donor.totalDonations.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📊 ${this.i18n.terms.donationCountLabel}:</strong></span>
            <span>${donor.donationCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>📈 ${this.i18n.terms.averageDonationLabel}:</strong></span>
            <span>₪${donor.averageDonation.toLocaleString()}</span>
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
    const donorsWithoutCoords = this.donors.filter(d => 
      !d.latitude && !d.longitude && d.address && d.address.trim() !== ''
    );

    if (donorsWithoutCoords.length === 0) {
      alert(this.i18n.terms.allDonorsHaveCoordinates);
      return;
    }

    this.loading = true;
    let updatedCount = 0;

    for (const donor of donorsWithoutCoords) {
      try {
        const coords = await this.geocodingService.geocodeAddress(
          donor.address!,
          donor.city,
          donor.country
        );

        if (coords) {
          donor.latitude = coords.latitude;
          donor.longitude = coords.longitude;
          await donor.save();
          updatedCount++;
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
}
