import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core'
import { Router } from '@angular/router'
import { remult } from 'remult'
import { TargetAudience } from '../../../shared/entity/target-audience'
import { DonorMapController, MarkerData, DonorMapData } from '../../../shared/controllers/donor-map.controller'
import { GeoService } from '../../services/geo.service'

declare const google: any

interface RouteStop {
  marker: MarkerData
  details?: DonorMapData
  visited: boolean
  order: number
}

@Component({
  selector: 'app-route-planner',
  templateUrl: './route-planner.component.html',
  styleUrls: ['./route-planner.component.scss']
})
export class RoutePlannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef

  // State
  loading = false
  mapReady = false
  routeCalculated = false
  calculatingRoute = false
  showDonorPopup = false

  // Target audiences
  targetAudiences: TargetAudience[] = []
  selectedAudienceId = ''

  // Map
  private map: any
  private googleMarkers: any[] = []
  private directionsRenderer: any
  private infoWindow: any
  private userLocationMarker: any

  // Donors on map
  donors: MarkerData[] = []
  routeStops: RouteStop[] = []
  selectedDonorDetails: DonorMapData | null = null

  // Route info
  routeTotalDistance = ''
  routeTotalDuration = ''
  routeLegs: { distance: string; duration: string; donorName: string }[] = []

  // User location
  userLat: number | null = null
  userLng: number | null = null

  constructor(
    private router: Router,
    private geoService: GeoService
  ) {}

  async ngOnInit() {
    this.registerGlobalCallbacks()
    this.loading = true
    try {
      // Load target audiences
      this.targetAudiences = await remult.repo(TargetAudience).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
    } finally {
      this.loading = false
    }
  }

  async ngAfterViewInit() {
    await this.initMap()
  }

  ngOnDestroy() {
    this.cleanupGlobalCallbacks()
    this.clearMap()
  }

  private async initMap() {
    try {
      await this.geoService.loadGoogleMapsApi()
      const maps = this.geoService.getGoogleMaps()

      // Default center: Israel
      const defaultCenter = { lat: 31.77, lng: 35.21 }

      this.map = new maps.Map(this.mapContainer.nativeElement, {
        center: defaultCenter,
        zoom: 8,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] }
        ]
      })

      this.directionsRenderer = new maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      })

      this.infoWindow = new maps.InfoWindow()
      this.mapReady = true

      // Try to get user location
      this.getUserLocation()
    } catch (err) {
      console.error('Failed to init map:', err)
    }
  }

  private getUserLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat = pos.coords.latitude
        this.userLng = pos.coords.longitude
        this.showUserLocation()
      },
      () => { /* User denied location - that's ok */ }
    )
  }

  private showUserLocation() {
    if (!this.map || this.userLat === null || this.userLng === null) return
    const maps = this.geoService.getGoogleMaps()

    if (this.userLocationMarker) {
      this.userLocationMarker.setMap(null)
    }

    this.userLocationMarker = new maps.Marker({
      position: { lat: this.userLat, lng: this.userLng },
      map: this.map,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      title: 'המיקום שלי',
      zIndex: 999
    })
  }

  async onAudienceChange() {
    this.routeCalculated = false
    this.routeStops = []
    this.routeLegs = []
    this.routeTotalDistance = ''
    this.routeTotalDuration = ''
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] })
    }

    if (!this.selectedAudienceId) {
      this.clearMarkers()
      this.donors = []
      return
    }

    this.loading = true
    try {
      const audience = this.targetAudiences.find(a => a.id === this.selectedAudienceId)
      if (!audience || !audience.donorIds?.length) {
        this.clearMarkers()
        this.donors = []
        return
      }

      // Get markers for donors in this audience
      const allMarkers = await DonorMapController.getMapMarkers({})
      this.donors = allMarkers.filter(m => audience.donorIds.includes(m.donorId))

      this.showMarkers()
      this.fitMapToDonors()
    } finally {
      this.loading = false
    }
  }

  private clearMarkers() {
    this.googleMarkers.forEach(m => m.setMap(null))
    this.googleMarkers = []
  }

  private clearMap() {
    this.clearMarkers()
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null)
    }
    if (this.userLocationMarker) {
      this.userLocationMarker.setMap(null)
    }
  }

  private showMarkers() {
    this.clearMarkers()
    if (!this.map) return
    const maps = this.geoService.getGoogleMaps()

    this.donors.forEach((donor, index) => {
      const marker = new maps.Marker({
        position: { lat: donor.lat, lng: donor.lng },
        map: this.map,
        title: donor.donorName,
        icon: this.getMarkerIcon(donor.status, index + 1),
        zIndex: 100
      })

      marker.addListener('click', () => this.onMarkerClick(donor))
      this.googleMarkers.push(marker)
    })
  }

  private getMarkerIcon(status: string, number: number): any {
    const colors: Record<string, string> = {
      'high-donor': '#f59e0b',
      'recent-donor': '#10b981',
      'active': '#667eea',
      'inactive': '#9ca3af'
    }
    const color = colors[status] || '#667eea'

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="14" r="10" fill="white" opacity="0.3"/>
          <text x="16" y="18" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">${number}</text>
        </svg>
      `)}`,
      scaledSize: { width: 32, height: 40 }
    }
  }

  private getRouteMarkerIcon(order: number, visited: boolean): any {
    const color = visited ? '#10b981' : '#667eea'
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.1 27.9 0 18 0z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="18" cy="16" r="12" fill="white" opacity="0.25"/>
          <text x="18" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial">${order}</text>
        </svg>
      `)}`,
      scaledSize: { width: 36, height: 44 }
    }
  }

  private fitMapToDonors() {
    if (!this.map || this.donors.length === 0) return
    const maps = this.geoService.getGoogleMaps()
    const bounds = new maps.LatLngBounds()

    this.donors.forEach(d => bounds.extend({ lat: d.lat, lng: d.lng }))

    if (this.userLat !== null && this.userLng !== null) {
      bounds.extend({ lat: this.userLat, lng: this.userLng })
    }

    this.map.fitBounds(bounds, { padding: 40 })
  }

  async onMarkerClick(donor: MarkerData) {
    if (!this.map) return

    // Show loading info window
    this.infoWindow.setContent(`
      <div style="text-align:center;padding:8px;font-family:Arial,sans-serif">
        <div style="font-weight:bold;margin-bottom:4px">${donor.donorName}</div>
        <div style="color:#888;font-size:12px">טוען פרטים...</div>
      </div>
    `)
    this.infoWindow.setPosition({ lat: donor.lat, lng: donor.lng })
    this.infoWindow.open(this.map)

    try {
      const details = await DonorMapController.getDonorMapDetails(donor.donorId)
      this.selectedDonorDetails = details

      const address = details.fullAddress || ''
      const phone = details.phone || ''
      const totalDonations = details.stats.totalDonations
        ? `${details.stats.totalDonationsCurrencySymbol}${Math.round(details.stats.totalDonations).toLocaleString()}`
        : ''

      this.infoWindow.setContent(`
        <div style="min-width:200px;font-family:Arial,sans-serif;direction:rtl;text-align:right;padding:4px">
          <div style="font-weight:bold;font-size:15px;margin-bottom:6px;color:#333">${donor.donorName}</div>
          ${address ? `<div style="font-size:13px;color:#666;margin-bottom:3px"><span style="color:#667eea">&#x1F4CD;</span> ${address}</div>` : ''}
          ${phone ? `<div style="font-size:13px;color:#666;margin-bottom:3px"><span style="color:#667eea">&#x1F4DE;</span> <a href="tel:${phone}" style="color:#667eea;text-decoration:none">${phone}</a></div>` : ''}
          ${totalDonations ? `<div style="font-size:13px;color:#666;margin-bottom:8px"><span style="color:#667eea">&#x1F4B0;</span> סה"כ: ${totalDonations}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px">
            <button onclick="window.__routePlanner_donate('${donor.donorId}')" style="flex:1;padding:8px 12px;border:none;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:13px;font-weight:bold;cursor:pointer">תרומה</button>
            <button onclick="window.__routePlanner_details('${donor.donorId}')" style="flex:1;padding:8px 12px;border:none;border-radius:8px;background:#f0f0f0;color:#333;font-size:13px;font-weight:bold;cursor:pointer">פרטים</button>
            <button onclick="window.__routePlanner_navigate(${donor.lat},${donor.lng})" style="padding:8px 12px;border:none;border-radius:8px;background:#33ccff;color:white;font-size:13px;font-weight:bold;cursor:pointer">Waze</button>
          </div>
        </div>
      `)
    } catch (err) {
      console.error('Failed to load donor details:', err)
    }
  }

  // Register global callbacks for info window buttons
  private registerGlobalCallbacks() {
    (window as any).__routePlanner_donate = (donorId: string) => {
      this.infoWindow?.close()
      this.router.navigate(['/m/quick-donation'], { queryParams: { donorId } })
    };

    (window as any).__routePlanner_details = (donorId: string) => {
      this.infoWindow?.close()
      this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, mode: 'details' } })
    };

    (window as any).__routePlanner_navigate = (lat: number, lng: number) => {
      this.openWaze(lat, lng)
    }
  }

  private cleanupGlobalCallbacks() {
    delete (window as any).__routePlanner_donate
    delete (window as any).__routePlanner_details
    delete (window as any).__routePlanner_navigate
  }

  async calculateRoute() {
    if (this.donors.length < 2 || !this.map) return
    this.calculatingRoute = true

    try {
      const maps = this.geoService.getGoogleMaps()
      const directionsService = new maps.DirectionsService()

      // Use user location as origin if available, otherwise first donor
      let origin: any
      if (this.userLat !== null && this.userLng !== null) {
        origin = { lat: this.userLat, lng: this.userLng }
      } else {
        origin = { lat: this.donors[0].lat, lng: this.donors[0].lng }
      }

      // Last donor is destination (or back to origin for round trip)
      const destination = origin

      // All donors are waypoints (max 23 for Google Directions)
      const maxWaypoints = Math.min(this.donors.length, 23)
      const waypoints = this.donors.slice(0, maxWaypoints).map(d => ({
        location: { lat: d.lat, lng: d.lng },
        stopover: true
      }))

      const request = {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: maps.TravelMode.DRIVING
      }

      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(request, (result: any, status: string) => {
          if (status === 'OK') resolve(result)
          else reject(new Error(`Directions failed: ${status}`))
        })
      })

      this.directionsRenderer.setDirections(result)

      // Parse route info
      const route = result.routes[0]
      const waypointOrder = route.waypoint_order || []

      // Build route stops in optimized order
      this.routeStops = waypointOrder.map((originalIndex: number, orderIndex: number) => ({
        marker: this.donors[originalIndex],
        visited: false,
        order: orderIndex + 1
      }))

      // Update marker icons with route order
      this.clearMarkers()
      this.routeStops.forEach(stop => {
        const marker = new maps.Marker({
          position: { lat: stop.marker.lat, lng: stop.marker.lng },
          map: this.map,
          title: `${stop.order}. ${stop.marker.donorName}`,
          icon: this.getRouteMarkerIcon(stop.order, false),
          zIndex: 200 - stop.order
        })
        marker.addListener('click', () => this.onMarkerClick(stop.marker))
        this.googleMarkers.push(marker)
      })

      // Calculate total distance and duration
      let totalDistance = 0
      let totalDuration = 0
      this.routeLegs = []

      route.legs.forEach((leg: any, i: number) => {
        totalDistance += leg.distance.value
        totalDuration += leg.duration.value

        if (i < this.routeStops.length) {
          this.routeLegs.push({
            distance: leg.distance.text,
            duration: leg.duration.text,
            donorName: this.routeStops[i].marker.donorName
          })
        }
      })

      this.routeTotalDistance = totalDistance >= 1000
        ? `${(totalDistance / 1000).toFixed(1)} ק"מ`
        : `${totalDistance} מ'`
      this.routeTotalDuration = this.formatDuration(totalDuration)
      this.routeCalculated = true
    } catch (err) {
      console.error('Route calculation failed:', err)
    } finally {
      this.calculatingRoute = false
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours} שע' ${minutes} דק'`
    }
    return `${minutes} דק'`
  }

  openWaze(lat: number, lng: number) {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')
  }

  openWazeForStop(stop: RouteStop) {
    this.openWaze(stop.marker.lat, stop.marker.lng)
    stop.visited = true

    // Update marker icon
    const stopIndex = this.routeStops.indexOf(stop)
    if (stopIndex >= 0 && stopIndex < this.googleMarkers.length) {
      this.googleMarkers[stopIndex].setIcon(this.getRouteMarkerIcon(stop.order, true))
    }
  }

  navigateToDonation(donorId: string) {
    this.router.navigate(['/m/quick-donation'], { queryParams: { donorId } })
  }

  navigateToDetails(donorId: string) {
    this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, mode: 'details' } })
  }

  get visitedCount(): number {
    return this.routeStops.filter(s => s.visited).length
  }
}
