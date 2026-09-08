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
    res.sendStatus(204)
    try {
      const sessionUser = (req as any).session?.['user']
      if (!sessionUser?.id) return
      await api.withRemult(req, undefined as any, async () => {
        const user = await remult.repo(User).findId(sessionUser.id)
        if (user?.settings?.globalFilters) {
          user.settings = { ...user.settings, globalFilters: undefined }
          await remult.repo(User).save(user)
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
