import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core'
import { Router } from '@angular/router'
import { remult } from 'remult'
import { TargetAudience } from '../../../shared/entity/target-audience'
import { DonorMapController, MarkerData, DonorMapData } from '../../../shared/controllers/donor-map.controller'
import { GeoService } from '../../services/geo.service'
import { UIToolsService } from '../../common/UIToolsService'
import { User } from '../../../shared/entity/user'

declare const google: any

// Module-level cache - persists across component instances within the session
let _mapSettingsCache: {
  selectedAudienceId?: string
  zoom?: number
  centerLat?: number
  centerLng?: number
  routeState?: {
    startPoint: { lat: number; lng: number }
    startDonorId?: string
    visitedDonorIds: string[]
  }
} | null = null

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
  private routePolylines: any[] = []
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
    private geoService: GeoService,
    private ui: UIToolsService
  ) {}

  private hasSavedPosition = false
  private pendingRouteRestore = false

  async ngOnInit() {
    this.registerGlobalCallbacks()
    // Load settings synchronously FIRST — before any async ops
    // so _mapSettingsCache is available when initMap() runs
    this.loadRoutePlannerSettings()
    this.loading = true
    try {
      // Load target audiences
      this.targetAudiences = await remult.repo(TargetAudience).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })

      // If we have a saved audience, auto-load its donors
      if (this.selectedAudienceId) {
        await this.onAudienceChange()
      }

      // If we have a saved route, schedule restore (needs map + donors)
      if (_mapSettingsCache?.routeState && this.donors.length >= 2) {
        this.pendingRouteRestore = true
        this.tryRestoreRoute()
      }
    } finally {
      this.loading = false
    }
  }

  async ngAfterViewInit() {
    await this.initMap()
  }

  ngOnDestroy() {
    clearTimeout(this.saveDebounceTimer)
    // Preserve routeState before overwriting cache
    const savedRouteState = _mapSettingsCache?.routeState
    // Always capture current map state into module-level cache
    if (this.map) {
      const center = this.map.getCenter()
      _mapSettingsCache = {
        selectedAudienceId: this.selectedAudienceId || undefined,
        zoom: this.map.getZoom(),
        centerLat: center?.lat(),
        centerLng: center?.lng()
      }
    } else if (_mapSettingsCache) {
      _mapSettingsCache.selectedAudienceId = this.selectedAudienceId || undefined
    }
    // Restore route state (with updated visited status)
    if (this.routeCalculated && savedRouteState) {
      savedRouteState.visitedDonorIds = this.routeStops.filter(s => s.visited).map(s => s.marker.donorId)
      if (_mapSettingsCache) _mapSettingsCache.routeState = savedRouteState
    }
    // Fire-and-forget DB save from cache values
    this.doSaveSettings(
      _mapSettingsCache?.zoom,
      _mapSettingsCache?.centerLat,
      _mapSettingsCache?.centerLng
    )
    this.cleanupGlobalCallbacks()
    this.clearMap()
  }

  private loadRoutePlannerSettings() {
    // Read from module-level cache first (always fresh within session)
    if (_mapSettingsCache) {
      if (_mapSettingsCache.selectedAudienceId) {
        this.selectedAudienceId = _mapSettingsCache.selectedAudienceId
      }
      if (_mapSettingsCache.centerLat != null && _mapSettingsCache.centerLng != null) {
        this.hasSavedPosition = true
      }
      return
    }
    // Fallback: read from remult.user.settings (first load / page refresh)
    const userSettings = (remult.user as any)?.settings?.routePlanner
    if (!userSettings) return
    if (userSettings.selectedAudienceId) {
      this.selectedAudienceId = userSettings.selectedAudienceId
    }
    if (userSettings.centerLat && userSettings.centerLng) {
      // Populate module-level cache from DB (so initMap can read it)
      _mapSettingsCache = {
        selectedAudienceId: userSettings.selectedAudienceId,
        zoom: userSettings.zoom,
        centerLat: userSettings.centerLat,
        centerLng: userSettings.centerLng
      }
      this.hasSavedPosition = true
    }
  }

  private saveDebounceTimer: any
  private updateCacheFromMap() {
    if (!this.map) return
    const center = this.map.getCenter()
    if (!center) return
    _mapSettingsCache = {
      ...(_mapSettingsCache || {}),
      selectedAudienceId: this.selectedAudienceId || undefined,
      zoom: this.map.getZoom(),
      centerLat: center.lat(),
      centerLng: center.lng()
    }
  }

  private saveRoutePlannerSettings() {
    this.updateCacheFromMap()
    clearTimeout(this.saveDebounceTimer)
    this.saveDebounceTimer = setTimeout(() => this.doSaveSettings(), 2000)
  }

  private async doSaveSettings(capturedZoom?: number, capturedLat?: number, capturedLng?: number) {
    if (!remult.user?.id) return
    try {
      const userRepo = remult.repo(User)
      const user = await userRepo.findId(remult.user.id)
      if (!user) return

      if (!user.settings) {
        user.settings = {} as any
      }
      // Use captured values (from ngOnDestroy) or read from map
      const zoom = capturedZoom ?? this.map?.getZoom()
      const center = (capturedLat != null && capturedLng != null)
        ? { lat: capturedLat, lng: capturedLng }
        : { lat: this.map?.getCenter()?.lat(), lng: this.map?.getCenter()?.lng() }

      user.settings!.routePlanner = {
        selectedAudienceId: this.selectedAudienceId || undefined,
        zoom: zoom || undefined,
        centerLat: center.lat || undefined,
        centerLng: center.lng || undefined
      }
      await userRepo.save(user)
      if (remult.user) {
        (remult.user as any).settings = user.settings
      }
    } catch (err) {
      console.error('Error saving route planner settings:', err)
    }
  }

  private async initMap() {
    try {
      await this.geoService.loadGoogleMapsApi()
      const maps = this.geoService.getGoogleMaps()

      // Read center/zoom from module-level cache (populated by loadRoutePlannerSettings)
      const center = (_mapSettingsCache?.centerLat != null && _mapSettingsCache?.centerLng != null)
        ? { lat: _mapSettingsCache.centerLat, lng: _mapSettingsCache.centerLng }
        : { lat: 31.77, lng: 35.21 }
      const zoom = _mapSettingsCache?.zoom || 8

      this.map = new maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] }
        ]
      })

      // After first idle (tiles loaded), add persistent listener for user interactions
      maps.event.addListenerOnce(this.map, 'idle', () => {
        this.map.addListener('idle', () => this.saveRoutePlannerSettings())
      })

      this.infoWindow = new maps.InfoWindow()
      this.mapReady = true

      // If donors were loaded before map was ready, show them now
      if (this.donors.length > 0) {
        this.showMarkers()
      }

      // If route restore is pending, try now that map is ready
      if (this.pendingRouteRestore) {
        this.tryRestoreRoute()
      }

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

  private async tryRestoreRoute() {
    if (!this.mapReady || this.donors.length < 2 || !this.pendingRouteRestore) return
    const saved = _mapSettingsCache?.routeState
    if (!saved) return
    this.pendingRouteRestore = false

    // Re-calculate route with saved start point (this rebuilds polylines + markers)
    await this.calculateRoute(saved.startPoint, saved.startDonorId)

    // Restore visited state
    if (saved.visitedDonorIds?.length) {
      this.routeStops.forEach((stop, index) => {
        if (saved.visitedDonorIds.includes(stop.marker.donorId)) {
          stop.visited = true
          if (index < this.googleMarkers.length) {
            this.googleMarkers[index].setIcon(this.getRouteMarkerIcon(stop.order, true))
          }
        }
      })
    }
  }

  async onAudienceChange(userInitiated = false) {
    // Clear cached route on user-initiated audience change
    if (userInitiated && _mapSettingsCache?.routeState) {
      delete _mapSettingsCache.routeState
    }

    this.routeCalculated = false
    this.routeStops = []
    this.routeLegs = []
    this.routeTotalDistance = ''
    this.routeTotalDuration = ''
    this.routePolylines.forEach(p => p.setMap(null))
    this.routePolylines = []

    // Save selected audience
    this.saveRoutePlannerSettings()

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
    this.routePolylines.forEach(p => p.setMap(null))
    this.routePolylines = []
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
        icon: this.getMarkerIcon(donor.statuses, index + 1),
        zIndex: 100
      })

      marker.addListener('click', () => this.onMarkerClick(donor))
      this.googleMarkers.push(marker)
    })
  }

  private getMarkerIcon(statuses: string[], number: number): any {
    // עדיפות צבע: תורם גדול > תרם לאחרונה > פעיל > לא פעיל
    let color = '#667eea'
    if (statuses.includes('high-donor')) color = '#f59e0b'
    else if (statuses.includes('recent-donor')) color = '#10b981'
    else if (statuses.includes('active')) color = '#667eea'
    else if (statuses.includes('inactive')) color = '#9ca3af'

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
    // Skip fitBounds on initial load if we have a saved position
    if (this.hasSavedPosition) {
      this.hasSavedPosition = false
      return
    }
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

  async chooseStartPoint() {
    if (this.donors.length < 2 || !this.map) return

    const options: { caption: string; id: string; lat?: number; lng?: number }[] = [
      { caption: '📍 המיקום שלי', id: '__my_location__' }
    ]
    this.donors.forEach(m => {
      options.push({ caption: `👤 ${m.donorName}`, id: m.donorId, lat: m.lat, lng: m.lng })
    })

    let selectedOption: { id: string; lat?: number; lng?: number } | null = null

    await this.ui.selectValuesDialog({
      values: options,
      title: 'בחר נקודת התחלה',
      onSelect: (selected) => {
        selectedOption = selected
      }
    })

    if (!selectedOption) return

    if ((selectedOption as any).id === '__my_location__') {
      if (this.userLat !== null && this.userLng !== null) {
        await this.calculateRoute({ lat: this.userLat, lng: this.userLng })
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          })
          this.userLat = pos.coords.latitude
          this.userLng = pos.coords.longitude
          this.showUserLocation()
          await this.calculateRoute({ lat: this.userLat, lng: this.userLng })
        } catch {
          this.ui.error('לא ניתן לקבל מיקום. בחר תורם כנקודת התחלה.')
        }
      }
    } else {
      const donor = this.donors.find(m => m.donorId === (selectedOption as any).id)
      if (donor) {
        await this.calculateRoute({ lat: donor.lat, lng: donor.lng }, (selectedOption as any).id)
      }
    }
  }

  async calculateRoute(startPoint: { lat: number; lng: number }, startDonorId?: string) {
    if (this.donors.length < 2 || !this.map) return
    this.calculatingRoute = true

    try {
      const maps = this.geoService.getGoogleMaps()
      const { Route } = await maps.importLibrary('routes') as any

      const originLatLng = new maps.LatLng(startPoint.lat, startPoint.lng)
      const destination = originLatLng // Round trip

      // Filter out the start donor from intermediates to avoid duplicates
      const intermediateDonors = startDonorId
        ? this.donors.filter(d => d.donorId !== startDonorId)
        : this.donors

      const maxWaypoints = Math.min(intermediateDonors.length, 25)
      const intermediates = intermediateDonors.slice(0, maxWaypoints).map(d => ({
        location: new maps.LatLng(d.lat, d.lng)
      }))

      const request = {
        origin: originLatLng,
        destination,
        intermediates,
        travelMode: 'DRIVING',
        optimizeWaypointOrder: true,
        fields: ['path', 'legs', 'optimizedIntermediateWaypointIndices', 'distanceMeters', 'durationMillis']
      }

      const { routes } = await Route.computeRoutes(request)

      if (!routes || routes.length === 0) {
        throw new Error('No route found')
      }

      const route = routes[0]

      // Draw polylines
      this.routePolylines.forEach(p => p.setMap(null))
      this.routePolylines = route.createPolylines({
        polylineOptions: {
          map: this.map,
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.8,
          zIndex: 1
        }
      })

      const waypointOrder: number[] = route.optimizedIntermediateWaypointIndices || []

      // Build route stops using intermediateDonors (excludes start donor)
      this.routeStops = waypointOrder.map((originalIndex: number, orderIndex: number) => ({
        marker: intermediateDonors[originalIndex],
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

      // Calculate total distance and duration from legs
      let totalDistance = 0
      let totalDuration = 0
      this.routeLegs = []

      const legs = route.legs || []
      legs.forEach((leg: any, i: number) => {
        const distMeters = leg.distanceMeters || 0
        const durMillis = leg.durationMillis || 0
        totalDistance += distMeters
        totalDuration += durMillis

        if (i < this.routeStops.length) {
          this.routeLegs.push({
            distance: distMeters >= 1000
              ? `${(distMeters / 1000).toFixed(1)} ק"מ`
              : `${distMeters} מ'`,
            duration: this.formatDuration(Math.round(durMillis / 1000)),
            donorName: this.routeStops[i].marker.donorName
          })
        }
      })

      this.routeTotalDistance = totalDistance >= 1000
        ? `${(totalDistance / 1000).toFixed(1)} ק"מ`
        : `${totalDistance} מ'`
      this.routeTotalDuration = this.formatDuration(Math.round(totalDuration / 1000))
      this.routeCalculated = true

      // Save route state to cache for tab-switch persistence
      if (!_mapSettingsCache) _mapSettingsCache = {}
      _mapSettingsCache.routeState = {
        startPoint,
        startDonorId,
        visitedDonorIds: []
      }
    } catch (err: any) {
      console.error('Route calculation failed:', err)
      this.ui.error('שגיאה בחישוב מסלול: ' + (err?.message || err))
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

  clearRoute() {
    this.routeCalculated = false
    this.routeStops = []
    this.routeLegs = []
    this.routeTotalDistance = ''
    this.routeTotalDuration = ''
    this.routePolylines.forEach(p => p.setMap(null))
    this.routePolylines = []
    // Clear cached route state
    if (_mapSettingsCache?.routeState) {
      delete _mapSettingsCache.routeState
    }
    // Restore regular donor markers
    this.showMarkers()
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

    // Update visited state in cache
    if (_mapSettingsCache?.routeState) {
      _mapSettingsCache.routeState.visitedDonorIds =
        this.routeStops.filter(s => s.visited).map(s => s.marker.donorId)
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
