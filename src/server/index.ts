import compression from 'compression'
import session from 'cookie-session'
import express from 'express'
import fs from 'fs'
import helmet from 'helmet'
import sslRedirect from 'heroku-ssl-redirect'
import path from 'path'
import { api } from './api'
import './docx'
import { getPlace, getPlaces, reverseGeocode } from './geo'
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
  app.use(helmet({ contentSecurityPolicy: false }))

  app.use(api)
  app.use('/api/geo/places', getPlaces)
  app.use('/api/geo/place-details', getPlace)
  app.use('/api/geo/reverse-geocode', reverseGeocode)

  let dist = path.resolve('dist/donation/browser')
  if (!fs.existsSync(dist)) {
    dist = path.resolve('../donation/browser')
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
