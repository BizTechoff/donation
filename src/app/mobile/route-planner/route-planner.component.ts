import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core'
import { Router, ActivatedRoute } from '@angular/router'
import { remult } from 'remult'
import { TargetAudience } from '../../../shared/entity/target-audience'
import { DonorMapController, MarkerData, DonorMapData } from '../../../shared/controllers/donor-map.controller'
import { GeoService } from '../../services/geo.service'
import { UIToolsService } from '../../common/UIToolsService'
import { User } from '../../../shared/entity/user'
import { Donor, Place, Country } from '../../../shared/entity'
import { I18nService } from '../../i18n/i18n.service'

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
  pendingOpenPopupDonorId?: string // פתח פופאפ לתורם זה כשהמפה נטענת
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
  @ViewChild('mapListContainer') mapListContainer!: ElementRef

  // State
  loading = false
  mapReady = false
  routeCalculated = false
  calculatingRoute = false
  showDonorPopup = false

  // Splitter state - default shows more map (75%) less list (25%)
  mapFlex = '1 1 75%'
  listFlex = '0 0 25%'
  private isDragging = false
  private startY = 0
  private startMapPercent = 75

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
  startDonor: MarkerData | null = null // Start point donor (if not user location)

  // Route info
  routeTotalDistance = ''
  routeTotalDuration = ''
  routeLegs: { distance: string; duration: string; donorName: string }[] = []

  // User location
  userLat: number | null = null
  userLng: number | null = null

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private geoService: GeoService,
    private ui: UIToolsService,
    private i18n: I18nService,
    private zone: NgZone
  ) {}

  private hasSavedPosition = false
  private pendingRouteRestore = false

  async ngOnInit() {
    this.registerGlobalCallbacks()
    // Load settings synchronously FIRST — before any async ops
    // so _mapSettingsCache is available when initMap() runs
    this.loadRoutePlannerSettings()

    // Check for openPopup query param (returning from donation/details)
    const openPopupDonorId = this.route.snapshot.queryParamMap.get('openPopup')
    if (openPopupDonorId) {
      if (!_mapSettingsCache) _mapSettingsCache = {}
      _mapSettingsCache.pendingOpenPopupDonorId = openPopupDonorId
      // Clear the query param from URL without navigation
      this.router.navigate([], { queryParams: {}, replaceUrl: true })
    }

    this.loading = true
    try {
      // Load target audiences
      this.targetAudiences = await remult.repo(TargetAudience).find({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })

      // If we have a saved audience, auto-load its donors (route will be restored from there)
      if (this.selectedAudienceId) {
        await this.onAudienceChange()
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

      // Add long-press listener for creating new donor
      this.setupLongPressListener(maps)

      // If donors were loaded before map was ready, show them now
      if (this.donors.length > 0) {
        this.showMarkers()
        // Try to open pending popup after markers are shown
        this.tryOpenPendingPopup()
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

  // Long-press handling for creating new donor
  private longPressTimer: any = null
  private longPressLatLng: { lat: number; lng: number } | null = null
  private isLongPressing = false
  private touchStartPos: { x: number; y: number } | null = null

  private setupLongPressListener(maps: any) {
    const mapDiv = this.mapContainer.nativeElement

    // Store the last click position from Google Maps click event
    let lastClickLatLng: { lat: number; lng: number } | null = null

    // Listen to Google Maps click event to get accurate lat/lng
    this.map.addListener('click', (e: any) => {
      if (e.latLng) {
        lastClickLatLng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      }
    })

    // Touch events for mobile long-press detection
    mapDiv.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length !== 1) return // Only single touch

      this.isLongPressing = true
      const touch = e.touches[0]
      this.touchStartPos = { x: touch.clientX, y: touch.clientY }

      this.longPressTimer = setTimeout(() => {
        if (!this.isLongPressing || !this.map) return

        // Get lat/lng from touch position using overlay projection
        const rect = mapDiv.getBoundingClientRect()
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top

        // Use OverlayView to convert pixel to lat/lng accurately
        const overlay = new maps.OverlayView()
        overlay.onAdd = () => {}
        overlay.draw = () => {}
        overlay.onRemove = () => {}
        overlay.setMap(this.map)

        // Wait for overlay to be added
        setTimeout(() => {
          const projection = overlay.getProjection()
          if (projection) {
            const latLng = projection.fromContainerPixelToLatLng(new maps.Point(x, y))
            if (latLng) {
              this.longPressLatLng = { lat: latLng.lat(), lng: latLng.lng() }

              // Trigger vibration feedback
              if (navigator.vibrate) {
                navigator.vibrate(50)
              }

              // Handle long-press inside Angular zone
              this.zone.run(() => {
                this.handleLongPress()
              })
            }
          }
          overlay.setMap(null)
        }, 10)
      }, 600) // 600ms hold for long-press
    }, { passive: true })

    mapDiv.addEventListener('touchmove', (e: TouchEvent) => {
      // Cancel long-press if finger moves more than 10 pixels
      if (this.touchStartPos && e.touches.length === 1) {
        const touch = e.touches[0]
        const dx = Math.abs(touch.clientX - this.touchStartPos.x)
        const dy = Math.abs(touch.clientY - this.touchStartPos.y)
        if (dx > 10 || dy > 10) {
          this.cancelLongPress()
        }
      }
    }, { passive: true })

    mapDiv.addEventListener('touchend', () => {
      this.cancelLongPress()
    }, { passive: true })

    mapDiv.addEventListener('touchcancel', () => {
      this.cancelLongPress()
    }, { passive: true })
  }

  private cancelLongPress() {
    this.isLongPressing = false
    this.touchStartPos = null
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private async handleLongPress() {
    if (!this.longPressLatLng) return

    const { lat, lng } = this.longPressLatLng
    this.longPressLatLng = null

    try {
      this.loading = true

      // Reverse geocode the location
      const result = await this.geoService.reverseGeocode(lat, lng)

      this.loading = false

      if (result && result.success) {
        // Ask user to confirm creating donor at this location
        const message = this.i18n.terms.createNewDonorAtLocationQuestion
          .replace('{address}', result.formattedAddress)

        const shouldCreate = await this.ui.yesNoQuestion(message, true)

        if (shouldCreate) {
          await this.createNewDonorWithAddress(result, lat, lng)
        }
      } else {
        this.ui.error(this.i18n.terms.addressNotFoundForLocation)
      }
    } catch (error) {
      console.error('Error in long-press handler:', error)
      this.loading = false
      this.ui.error(this.i18n.terms.errorGettingAddress)
    }
  }

  private async createNewDonorWithAddress(geocodeResult: any, lat: number, lng: number) {
    try {
      const placeDto = geocodeResult.placeDto

      if (!placeDto || !placeDto.valid) {
        this.ui.error(this.i18n.terms.errorGettingAddress)
        return
      }

      // Get country code
      const countryCode = placeDto.countryCode || 'IL'

      // Load Country entity from database
      let countryEntity: Country | undefined
      try {
        countryEntity = await remult.repo(Country).findFirst({
          code: countryCode
        })

        if (!countryEntity) {
          console.warn(`Country with code ${countryCode} not found, creating new...`)
          const countryName = placeDto.countryName || placeDto.country || countryCode
          countryEntity = await remult.repo(Country).insert({
            name: countryName,
            nameEn: countryName,
            code: countryCode.toUpperCase(),
            phonePrefix: '',
            currencyId: 'USD',
            isActive: true
          })
        }
      } catch (error) {
        console.error('Error loading/creating country:', error)
      }

      // Create Place entity
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
      }

      // Save Place to database
      const savedPlace = await Place.findOrCreate(placeData, remult.repo(Place))
      console.log('Place saved successfully with ID:', savedPlace.id)

      // Open donor details dialog with the saved Place
      const changed = await this.ui.donorDetailsDialog('new', { initialPlace: savedPlace })

      if (changed) {
        // Reload map data after donor was created
        setTimeout(async () => {
          if (this.selectedAudienceId) {
            await this.onAudienceChange()
          }

          // Ask if user wants to add donation immediately
          const addDonation = await this.ui.yesNoQuestion(
            this.i18n.terms.donorCreatedAddDonationQuestion || 'התורם נוצר בהצלחה. להזין תרומה?',
            true
          )

          if (addDonation) {
            // Navigate to quick donation with the new donor
            // We need to get the donor ID from the last created donor
            const latestDonor = await remult.repo(Donor).findFirst(
              {},
              { orderBy: { createdDate: 'desc' } }
            )
            if (latestDonor) {
              this.router.navigate(['/m/quick-donation'], {
                queryParams: { donorId: latestDonor.id, source: 'map' }
              })
            }
          }
        })
      }
    } catch (error) {
      console.error('Error creating donor:', error)
      this.ui.error(this.i18n.terms.errorSavingDonor || 'שגיאה בשמירת התורם')
    }
  }

  // פתח פופאפ אם יש תורם ממתין (חזרה ממסך תרומה/פרטים)
  private tryOpenPendingPopup() {
    const donorId = _mapSettingsCache?.pendingOpenPopupDonorId
    if (!donorId || !this.mapReady || this.donors.length === 0) return

    const donor = this.donors.find(d => d.donorId === donorId)
    if (donor) {
      // מרכז את המפה על התורם ופתח את הפופאפ
      this.map?.setCenter({ lat: donor.lat, lng: donor.lng })
      this.onMarkerClick(donor)
    }

    // נקה את הפופאפ הממתין
    if (_mapSettingsCache) {
      delete _mapSettingsCache.pendingOpenPopupDonorId
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
    if (!saved?.startPoint?.lat || !saved?.startPoint?.lng) {
      this.pendingRouteRestore = false
      return
    }
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
      // Load full audience record (includes routeData)
      // Use find() instead of findId() to bypass potential caching issues
      const audiences = await remult.repo(TargetAudience).find({
        where: { id: this.selectedAudienceId },
        limit: 1
      })
      const audience = audiences?.[0]
      if (!audience) {
        console.log('[RoutePlanner] Audience not found')
        this.clearMarkers()
        this.donors = []
        return
      }
      if (!audience.donorIds?.length) {
        this.clearMarkers()
        this.donors = []
        return
      }

      // Get markers for donors in this audience
      const allMarkers = await DonorMapController.getMapMarkers({})
      this.donors = allMarkers.filter(m => audience.donorIds.includes(m.donorId))

      this.showMarkers()
      this.fitMapToDonors()

      // Try to open pending popup if returning from donation/details
      this.tryOpenPendingPopup()

      // Try to load saved route from database (not cache)
      console.log('[RoutePlanner] Full audience record:', JSON.stringify({
        id: audience.id,
        name: audience.name,
        donorIds: audience.donorIds?.length,
        routeData: audience.routeData
      }))
      if (audience.routeData?.waypointOrder?.length) {
        console.log('[RoutePlanner] Loading saved route with', audience.routeData.waypointOrder.length, 'stops')
        const loaded = await this.loadSavedRoute(audience)
        console.log('[RoutePlanner] Route loaded:', loaded)
      } else {
        console.log('[RoutePlanner] No routeData or empty waypointOrder')
      }
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

  // Start point marker - same style as other stops, number 1
  private getStartPointMarkerIcon(): any {
    return this.getRouteMarkerIcon(1, false)
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

  // Fit map to show the entire route (start point + stops, NOT user location unless it's the start)
  private fitMapToRoute(startPoint: { lat: number; lng: number }, stops: RouteStop[]) {
    if (!this.map || stops.length === 0) return
    const maps = this.geoService.getGoogleMaps()
    const bounds = new maps.LatLngBounds()

    // Include start point
    bounds.extend({ lat: startPoint.lat, lng: startPoint.lng })

    // Include all stops
    stops.forEach(stop => {
      if (stop.marker?.lat && stop.marker?.lng) {
        bounds.extend({ lat: stop.marker.lat, lng: stop.marker.lng })
      }
    })

    this.map.fitBounds(bounds, { padding: 50 })
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
      this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, source: 'map' } })
    };

    (window as any).__routePlanner_details = (donorId: string) => {
      this.infoWindow?.close()
      this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, mode: 'details', source: 'map' } })
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

    // Validate startPoint
    if (!startPoint?.lat || !startPoint?.lng) {
      console.error('[RoutePlanner] calculateRoute called with invalid startPoint:', startPoint)
      return
    }

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

      // Extract polyline path for saving to DB
      let polylinePath: { lat: number; lng: number }[] = []
      if (this.routePolylines.length > 0) {
        const path = this.routePolylines[0].getPath()
        path.forEach((point: any) => {
          polylinePath.push({ lat: point.lat(), lng: point.lng() })
        })
      }

      const waypointOrder: number[] = route.optimizedIntermediateWaypointIndices || []

      // Build route stops using intermediateDonors (excludes start donor)
      this.routeStops = waypointOrder.map((originalIndex: number, orderIndex: number) => ({
        marker: intermediateDonors[originalIndex],
        visited: false,
        order: orderIndex + 1
      }))

      // Update marker icons with route order
      this.clearMarkers()

      // Add start point marker if it's a donor (not user location)
      this.startDonor = null
      if (startDonorId) {
        const foundStartDonor = this.donors.find(d => d.donorId === startDonorId)
        if (foundStartDonor) {
          this.startDonor = foundStartDonor
          const startMarker = new maps.Marker({
            position: { lat: foundStartDonor.lat, lng: foundStartDonor.lng },
            map: this.map,
            title: `נקודת התחלה: ${foundStartDonor.donorName}`,
            icon: this.getStartPointMarkerIcon(),
            zIndex: 300 // Above all other markers
          })
          startMarker.addListener('click', () => this.onMarkerClick(foundStartDonor))
          this.googleMarkers.push(startMarker)
        }
      }

      // If there's a start donor, offset stop numbers by 1 (start = 1, stops = 2, 3, 4...)
      const orderOffset = this.startDonor ? 1 : 0
      this.routeStops.forEach(stop => {
        const displayOrder = stop.order + orderOffset
        const marker = new maps.Marker({
          position: { lat: stop.marker.lat, lng: stop.marker.lng },
          map: this.map,
          title: `${displayOrder}. ${stop.marker.donorName}`,
          icon: this.getRouteMarkerIcon(displayOrder, false),
          zIndex: 200 - stop.order
        })
        marker.addListener('click', () => this.onMarkerClick(stop.marker))
        this.googleMarkers.push(marker)
      })

      // Calculate total distance and duration from legs
      let totalDistance = 0
      let totalDuration = 0
      const legsData: { distanceMeters: number; durationSeconds: number }[] = []
      this.routeLegs = []

      const legs = route.legs || []
      legs.forEach((leg: any, i: number) => {
        const distMeters = leg.distanceMeters || 0
        const durMillis = leg.durationMillis || 0
        totalDistance += distMeters
        totalDuration += durMillis

        // Save leg data for DB
        legsData.push({
          distanceMeters: distMeters,
          durationSeconds: Math.round(durMillis / 1000)
        })

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

      // Zoom to fit the entire route
      this.fitMapToRoute(startPoint, this.routeStops)

      // Save route state to cache for tab-switch persistence
      if (!_mapSettingsCache) _mapSettingsCache = {}
      _mapSettingsCache.routeState = {
        startPoint,
        startDonorId,
        visitedDonorIds: []
      }

      // Save route to TargetAudience record in database (including polyline path!)
      await this.saveRouteToAudience(startPoint, startDonorId, waypointOrder, intermediateDonors, {
        polylinePath,
        totalDistanceMeters: totalDistance,
        totalDurationSeconds: Math.round(totalDuration / 1000),
        legs: legsData
      })
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

  // Save route data to TargetAudience record (including full polyline path from Google)
  private async saveRouteToAudience(
    startPoint: { lat: number; lng: number },
    startDonorId: string | undefined,
    waypointOrder: number[],
    intermediateDonors: MarkerData[],
    routeDetails?: {
      polylinePath: { lat: number; lng: number }[]
      totalDistanceMeters: number
      totalDurationSeconds: number
      legs: { distanceMeters: number; durationSeconds: number }[]
    }
  ) {
    if (!this.selectedAudienceId) return

    try {
      const audience = await remult.repo(TargetAudience).findId(this.selectedAudienceId)
      if (!audience) return

      // Build ordered donor IDs list
      const orderedDonorIds = waypointOrder.map(idx => intermediateDonors[idx].donorId)

      const routeDataToSave = {
        startPoint,
        startDonorId,
        waypointOrder: orderedDonorIds,
        calculatedAt: new Date().toISOString(),
        // Save full route data from Google - no need to call API again!
        polylinePath: routeDetails?.polylinePath,
        totalDistanceMeters: routeDetails?.totalDistanceMeters,
        totalDurationSeconds: routeDetails?.totalDurationSeconds,
        legs: routeDetails?.legs
      }

      console.log('[RoutePlanner] Saving routeData with', routeDataToSave.polylinePath?.length || 0, 'path points')
      audience.routeData = routeDataToSave

      const saved = await remult.repo(TargetAudience).save(audience)
      console.log('[RoutePlanner] Route saved successfully')

      // Verify by re-fetching from DB
      const verify = await remult.repo(TargetAudience).findId(this.selectedAudienceId)
      console.log('[RoutePlanner] Verification fetch routeData:', JSON.stringify(verify?.routeData))
    } catch (err) {
      console.error('Failed to save route to audience:', err)
    }
  }

  // Load saved route from TargetAudience without recalculating
  private async loadSavedRoute(audience: TargetAudience) {
    if (!audience.routeData || !audience.routeData.waypointOrder?.length) return false
    if (!this.mapReady || this.donors.length < 2) return false

    const { startPoint, startDonorId, waypointOrder } = audience.routeData

    // Validate startPoint has required lat/lng
    if (!startPoint?.lat || !startPoint?.lng) {
      console.warn('[RoutePlanner] Invalid startPoint in saved route:', startPoint)
      return false
    }

    // Build route stops from saved order
    const orderedStops: RouteStop[] = []
    waypointOrder.forEach((donorId, index) => {
      const donor = this.donors.find(d => d.donorId === donorId)
      if (donor) {
        orderedStops.push({
          marker: donor,
          visited: false,
          order: index + 1
        })
      }
    })

    if (orderedStops.length < 2) return false

    this.routeStops = orderedStops

    // Draw saved route from DB (no API call - uses saved polyline path!)
    await this.drawSavedRoute(startPoint, orderedStops, audience)

    return true
  }

  // Draw saved route from database - NO API CALL, uses saved polyline path!
  private async drawSavedRoute(startPoint: { lat: number; lng: number }, stops: RouteStop[], audience: TargetAudience) {
    const maps = this.geoService.getGoogleMaps()

    // Validate all stops have valid markers with lat/lng
    const validStops = stops.filter(stop => stop.marker?.lat && stop.marker?.lng)
    if (validStops.length < 2) {
      console.warn('[RoutePlanner] Not enough valid stops for route:', validStops.length)
      return false
    }

    // Clear existing markers and polylines
    this.routePolylines.forEach(p => p.setMap(null))
    this.routePolylines = []
    this.clearMarkers()

    // Use saved polyline path from DB (actual road path from Google, saved when route was calculated)
    const savedPath = audience.routeData?.polylinePath
    if (savedPath && savedPath.length > 0) {
      console.log('[RoutePlanner] Drawing saved polyline with', savedPath.length, 'points')
      const polyline = new maps.Polyline({
        path: savedPath,
        map: this.map,
        strokeColor: '#667eea',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        zIndex: 1
      })
      this.routePolylines.push(polyline)
    } else {
      // Fallback: straight lines if no saved path (old data)
      console.log('[RoutePlanner] No saved polyline, using straight lines')
      const pathPoints = [
        { lat: startPoint.lat, lng: startPoint.lng },
        ...validStops.map(stop => ({ lat: stop.marker.lat, lng: stop.marker.lng })),
        { lat: startPoint.lat, lng: startPoint.lng }
      ]
      const polyline = new maps.Polyline({
        path: pathPoints,
        map: this.map,
        strokeColor: '#667eea',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        geodesic: true,
        zIndex: 1
      })
      this.routePolylines.push(polyline)
    }

    // Add start point marker if it's a donor (not user location)
    this.startDonor = null
    const startDonorId = audience.routeData?.startDonorId
    if (startDonorId) {
      const foundStartDonor = this.donors.find(d => d.donorId === startDonorId)
      if (foundStartDonor) {
        this.startDonor = foundStartDonor
        const startMarker = new maps.Marker({
          position: { lat: foundStartDonor.lat, lng: foundStartDonor.lng },
          map: this.map,
          title: `נקודת התחלה: ${foundStartDonor.donorName}`,
          icon: this.getStartPointMarkerIcon(),
          zIndex: 300 // Above all other markers
        })
        startMarker.addListener('click', () => this.onMarkerClick(foundStartDonor))
        this.googleMarkers.push(startMarker)
      }
    }

    // Show route markers
    // If there's a start donor, offset stop numbers by 1 (start = 1, stops = 2, 3, 4...)
    const orderOffset = this.startDonor ? 1 : 0
    validStops.forEach(stop => {
      const displayOrder = stop.order + orderOffset
      const marker = new maps.Marker({
        position: { lat: stop.marker.lat, lng: stop.marker.lng },
        map: this.map,
        title: `${displayOrder}. ${stop.marker.donorName}`,
        icon: this.getRouteMarkerIcon(displayOrder, stop.visited),
        zIndex: 200 - stop.order
      })
      marker.addListener('click', () => this.onMarkerClick(stop.marker))
      this.googleMarkers.push(marker)
    })

    this.routeCalculated = true

    // Zoom to fit the entire route (excluding user location if not start point)
    this.fitMapToRoute(startPoint, validStops)

    // Use saved distance/duration data
    const savedLegs = audience.routeData?.legs || []
    this.routeLegs = validStops.map((stop, i) => ({
      distance: savedLegs[i]?.distanceMeters
        ? (savedLegs[i].distanceMeters >= 1000
          ? `${(savedLegs[i].distanceMeters / 1000).toFixed(1)} ק"מ`
          : `${savedLegs[i].distanceMeters} מ'`)
        : '',
      duration: savedLegs[i]?.durationSeconds
        ? this.formatDuration(savedLegs[i].durationSeconds)
        : '',
      donorName: stop.marker.donorName
    }))

    const totalDist = audience.routeData?.totalDistanceMeters || 0
    const totalDur = audience.routeData?.totalDurationSeconds || 0
    this.routeTotalDistance = totalDist >= 1000
      ? `${(totalDist / 1000).toFixed(1)} ק"מ`
      : totalDist > 0 ? `${totalDist} מ'` : ''
    this.routeTotalDuration = totalDur > 0 ? this.formatDuration(totalDur) : ''

    // Update cache
    if (!_mapSettingsCache) _mapSettingsCache = {}
    _mapSettingsCache.routeState = {
      startPoint,
      startDonorId: audience.routeData?.startDonorId,
      visitedDonorIds: []
    }

    return true
  }

  async clearRoute() {
    this.routeCalculated = false
    this.routeStops = []
    this.routeLegs = []
    this.routeTotalDistance = ''
    this.routeTotalDuration = ''
    this.startDonor = null
    this.routePolylines.forEach(p => p.setMap(null))
    this.routePolylines = []
    // Clear cached route state
    if (_mapSettingsCache?.routeState) {
      delete _mapSettingsCache.routeState
    }
    // Clear route from database
    if (this.selectedAudienceId) {
      try {
        const audience = await remult.repo(TargetAudience).findId(this.selectedAudienceId)
        if (audience && audience.routeData) {
          audience.routeData = undefined
          await remult.repo(TargetAudience).save(audience)
        }
      } catch (err) {
        console.error('Failed to clear route from database:', err)
      }
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
    this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, source: 'map' } })
  }

  navigateToDetails(donorId: string) {
    this.router.navigate(['/m/quick-donation'], { queryParams: { donorId, mode: 'details', source: 'map' } })
  }

  get visitedCount(): number {
    return this.routeStops.filter(s => s.visited).length
  }

  // ==================== Splitter Handling ====================

  onSplitterTouchStart(event: TouchEvent) {
    event.preventDefault()
    this.startDrag(event.touches[0].clientY)

    const onTouchMove = (e: TouchEvent) => this.onDrag(e.touches[0].clientY)
    const onTouchEnd = () => {
      this.endDrag()
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  onSplitterMouseDown(event: MouseEvent) {
    event.preventDefault()
    this.startDrag(event.clientY)

    const onMouseMove = (e: MouseEvent) => this.onDrag(e.clientY)
    const onMouseUp = () => {
      this.endDrag()
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  private startDrag(clientY: number) {
    this.isDragging = true
    this.startY = clientY
    // Parse current map percentage from flex value
    const match = this.mapFlex.match(/(\d+)%/)
    this.startMapPercent = match ? parseInt(match[1], 10) : 75
  }

  private onDrag(clientY: number) {
    if (!this.isDragging || !this.mapListContainer) return

    const container = this.mapListContainer.nativeElement
    const containerHeight = container.offsetHeight
    const deltaY = clientY - this.startY
    const deltaPercent = (deltaY / containerHeight) * 100

    let newMapPercent = this.startMapPercent + deltaPercent
    // Clamp between 20% and 80%
    newMapPercent = Math.max(20, Math.min(80, newMapPercent))

    const listPercent = 100 - newMapPercent
    this.mapFlex = `1 1 ${newMapPercent}%`
    this.listFlex = `0 0 ${listPercent}%`

    // Trigger map resize to adjust to new size
    if (this.map) {
      google.maps.event.trigger(this.map, 'resize')
    }
  }

  private endDrag() {
    this.isDragging = false
  }
}
