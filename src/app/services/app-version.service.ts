import { Injectable, NgZone, OnDestroy } from '@angular/core'

/**
 * AppVersionService - notices when the server has been redeployed.
 *
 * Why this exists: the server already sends `Cache-Control: no-store` for
 * index.html, so there is no caching bug to fix. The problem is simpler and
 * cache headers cannot reach it - the client leaves the tab open for days and
 * never reloads, so a deploy never arrives. That is what turned the last round
 * into an argument over which fixes had been delivered, and why we kept asking
 * the client to press CTRL+SHIFT+R.
 *
 * How it works: /api/app-version returns the server's build identity. The
 * first answer of the session becomes the BASELINE - nothing is stamped into
 * the bundle at build time, so this needs no build changes at all. From then
 * on the same endpoint is polled on an interval and, more importantly,
 * whenever the tab regains focus (that is when a person actually comes back to
 * work). A different value means a new server is live.
 *
 * It only RAISES A FLAG. Reloading is the user's choice - an automatic reload
 * would throw away a half-filled donation form.
 */
@Injectable({ providedIn: 'root' })
export class AppVersionService implements OnDestroy {
  /** True once the server reports a build different from the one we loaded with. */
  newVersionAvailable = false

  /** The build this tab is running against. Shown in the footer. */
  currentBuildId = ''

  private baseline: string | null = null
  private timer: any
  private readonly onFocus = () => this.check()
  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') this.check()
  }

  /** Poll every 5 minutes. The focus listener is what usually catches it first. */
  private static readonly INTERVAL_MS = 5 * 60 * 1000

  constructor(private zone: NgZone) { }

  /** Called once from AppComponent.ngOnInit. */
  start() {
    if (this.timer) return
    this.check()
    // Outside Angular so a background poll does not trigger change detection
    // every five minutes for nothing; we re-enter the zone only on a change.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.check(), AppVersionService.INTERVAL_MS)
      window.addEventListener('focus', this.onFocus)
      document.addEventListener('visibilitychange', this.onVisible)
    })
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer)
    window.removeEventListener('focus', this.onFocus)
    document.removeEventListener('visibilitychange', this.onVisible)
  }

  /**
   * The only action offered. A plain reload is already equivalent to
   * CTRL+SHIFT+R here - index.html is served no-store and the bundles carry
   * content hashes, so a new index points at new filenames - and JavaScript
   * cannot force a hard reload anyway (location.reload(true) is long gone).
   *
   * Clearing Cache Storage and any service worker first is a no-op today
   * (the project registers neither) and is here as insurance: if a PWA layer
   * is ever added, this button keeps working without anyone remembering it.
   *
   * It touches NOTHING that holds the session: cookies, localStorage,
   * sessionStorage and IndexedDB are all untouched, so the user stays signed
   * in, and the global filters survive through the sessionStorage stash that
   * the unload handler writes.
   */
  async reload() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
    } catch {
      // Never block the reload over housekeeping.
    }
    window.location.reload()
  }

  private async check() {
    if (this.newVersionAvailable) return // already flagged; stop asking
    try {
      const res = await fetch('/api/app-version', { cache: 'no-store' })
      if (!res.ok) return
      const { buildId } = await res.json()
      if (!buildId) return

      if (this.baseline === null) {
        this.baseline = buildId
        this.zone.run(() => (this.currentBuildId = buildId))
        return
      }
      if (buildId !== this.baseline) {
        // Back inside Angular so the banner actually renders.
        this.zone.run(() => (this.newVersionAvailable = true))
      }
    } catch {
      // Offline or a restarting server - say nothing and try again next tick.
    }
  }
}
