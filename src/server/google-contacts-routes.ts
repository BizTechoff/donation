import { Router } from 'express'
import { remult } from 'remult'
import { GoogleContactsController } from '../shared/controllers/google-contacts.controller'
import { verifyStateToken } from './google-contacts'
import { api } from './api'

export const googleContactsRouter = Router()

const SYNC_ROUTE = '/' + encodeURIComponent('סנכרון Google')

// OAuth2 callback - Google redirects here after user grants consent
googleContactsRouter.get('/oauth2callback', api.withRemult, async (req, res) => {
  try {
    const code = req.query['code'] as string
    const state = req.query['state'] as string
    const error = req.query['error'] as string

    if (error) {
      console.error('[GoogleContacts] OAuth error:', error)
      return res.redirect(SYNC_ROUTE + '?google-sync=error&reason=' + encodeURIComponent(error))
    }

    if (!code || !state) {
      return res.redirect(SYNC_ROUTE + '?google-sync=error&reason=missing_params')
    }

    // Verify state and extract userId
    const stateData = verifyStateToken(state)
    if (!stateData) {
      return res.redirect(SYNC_ROUTE + '?google-sync=error&reason=invalid_state')
    }

    // Exchange code for tokens
    await GoogleContactsController.handleCallbackDelegate(stateData.userId, code, state)

    // Redirect back to app with success
    return res.redirect(SYNC_ROUTE + '?google-sync=success')
  } catch (err: any) {
    console.error('[GoogleContacts] OAuth callback error:', err)
    return res.redirect(SYNC_ROUTE + '?google-sync=error&reason=' + encodeURIComponent(err.message))
  }
})
