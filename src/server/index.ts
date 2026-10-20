import compression from 'compression'
import session from 'cookie-session'
import express from 'express'
import fs from 'fs'
import helmet from 'helmet'
import sslRedirect from 'heroku-ssl-redirect'
import path from 'path'
import { api } from './api'
import './docx'
import { getPlace, getPlaces, reverseGeocode, getGoogleMapsApiKey } from './geo'
import './email'
import './s3'
import './google-contacts'
import { scanRouter } from './scan-api'
import { googleContactsRouter } from './google-contacts-routes'
import { checkAndSendReminders } from './scheduler'
import { remult } from 'remult'
import { User } from '../shared/entity/user'
import { UserSettingsController } from '../shared/controllers/user-settings.controller'

async function startup() {
  const app = express()
  app.use(sslRedirect())
  app.use(
    '/api',
    session({
      keys: [
        process.env['NODE_ENV'] === 'production'
          ? process.env['SESSION_SECRET']!
          : process.env['SESSION_SECRET_DEV'] || 'dev-secret-key'
      ],
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1y
    })
  )
  app.use(compression())
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  )

  app.use(api)
  // Clears the user's global filters when the browser goes away.
  //
  // A1 says the filters must not survive the session, and signOut() already
  // clears them - but closing the tab with the X never reaches signOut. The
  // client sends navigator.sendBeacon() here on beforeunload, which the browser
  // delivers even while the page is being torn down (a normal fetch is cancelled).
  // A beacon cannot carry headers or read a response, so this route relies on
  // the same session cookie as the rest of the API, and always answers 204.
  app.post('/api/session/clear-global-filters', async (req, res) => {
    // Answer immediately: a beacon cannot read a response, and the browser is
    // already tearing the page down.
    res.sendStatus(204)
    try {
      const sessionUser = (req as any).session?.['user']
      if (!sessionUser?.id) return

      // withRemultAsync, NOT withRemult - the latter is the express middleware
      // (req, res, next) and would swallow this callback as `next`, running it
      // outside a remult context with nothing awaiting it or catching its errors.
      await api.withRemultAsync(req, async () => {
        // Item 33 - the same single read-modify-write every screen uses.
        const user = await remult.repo(User).findId(sessionUser.id, { useCache: false })
        if (user?.settings?.globalFilters) {
          await UserSettingsController.patch(sessionUser.id, 'globalFilters', 'set', null)
        }
      })
    } catch (err) {
      console.error('[clear-global-filters]', err)
    }
  })

  app.use('/api/scan', scanRouter)
  app.use('/api/geo/places', getPlaces)
  app.use('/api/geo/place-details', getPlace)
  app.use('/api/geo/reverse-geocode', reverseGeocode)
  app.use('/api/geo/maps-api-key', getGoogleMapsApiKey)
  app.use('/api/google-contacts', googleContactsRouter)

  /**
   * Build identity, for the running-version check in the browser.
   *
   * Correct cache headers (below) only help when the browser RELOADS. The
   * client leaves the tab open for days, so a deploy simply never reaches it -
   * which is how we ended up arguing over which fixes were delivered. The app
   * therefore asks this endpoint who it is talking to: it records the answer
   * once on load as its baseline, then re-asks on an interval and whenever the
   * tab regains focus. A different value means the server was redeployed.
   *
   * Nothing is stamped at build time on purpose - the baseline is whatever the
   * server said when the tab opened, so this works with no build changes.
   * On Railway the commit sha is injected automatically; the process start
   * time is the fallback, which is just as good a "did the server change" key.
   */
  const BUILD_ID =
    process.env['RAILWAY_GIT_COMMIT_SHA'] ||
    process.env['BUILD_ID'] ||
    String(Date.now())
  console.log('[Server] BUILD_ID:', BUILD_ID)

  app.get('/api/app-version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.json({ buildId: BUILD_ID })
  })


  console.log(`HI FROM YYG SERVER. CURRENT TIME: ${new Date()}. __dirname: ${__dirname}. process.cwd(): ${process.cwd()}`)

  let dist = path.resolve('dist/donation/browser')
  console.log('[Server] Checking dist path:', dist, 'exists:', fs.existsSync(dist))
  if (!fs.existsSync(dist)) {
    dist = path.resolve('../donation/browser')
    console.log('[Server] Fallback dist path:', dist, 'exists:', fs.existsSync(dist))
  }

  // Log assets directory
  const assetsPath = path.join(dist, 'assets')
  console.log('[Server] Assets path:', assetsPath, 'exists:', fs.existsSync(assetsPath))
  if (fs.existsSync(assetsPath)) {
    console.log('[Server] Assets contents:', fs.readdirSync(assetsPath))
  }

  // Hashed bundles may be cached forever; index.html must NOT be, or the
  // browser keeps serving an old index that points at old bundles until the
  // user presses Ctrl+Shift+R. That is the likely mechanism behind the
  // "filter sometimes hidden" report (W14) - a stale build, not stale data.
  app.use(express.static(dist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    }
  }))
  app.use('/*', async (req, res) => {
    if (req.headers.accept?.includes('json')) {
      console.log(req)
      res.status(404).json('missing route: ' + req.originalUrl)
      return
    }
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.sendFile(dist + '/index.html')
    } catch (err) {
      res.sendStatus(500)
    }
  })
  let port = process.env['PORT'] || 3002
  app.listen(port)

}
startup()
