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
import './s3'
import { checkAndSendReminders } from './scheduler'

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
  app.use('/api/geo/places', getPlaces)
  app.use('/api/geo/place-details', getPlace)
  app.use('/api/geo/reverse-geocode', reverseGeocode)
  app.use('/api/geo/maps-api-key', getGoogleMapsApiKey)


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

  app.use(express.static(dist))
  app.use('/*', async (req, res) => {
    if (req.headers.accept?.includes('json')) {
      console.log(req)
      res.status(404).json('missing route: ' + req.originalUrl)
      return
    }
    try {
      res.sendFile(dist + '/index.html')
    } catch (err) {
      res.sendStatus(500)
    }
  })
  let port = process.env['PORT'] || 3002
  app.listen(port)

}
startup()
