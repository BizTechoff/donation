import { config } from 'dotenv'
import crypto from 'crypto'
import { google, people_v1 } from 'googleapis'
import { remult } from 'remult'
import { GoogleContactsController } from '../shared/controllers/google-contacts.controller'
import { GoogleAuth } from '../shared/entity/google-auth'
import { GoogleContactMapping } from '../shared/entity/google-contact-mapping'
import { GoogleSyncLog } from '../shared/entity/google-sync-log'
import { Donor } from '../shared/entity/donor'
import { DonorContact } from '../shared/entity/donor-contact'
import { DonorPlace } from '../shared/entity/donor-place'
import { Place } from '../shared/entity/place'
import { GoogleAuthStatus, SyncOptions, SyncResult, SyncType } from '../shared/type/google-contacts.type'
import { runSync } from './google-contacts-sync'

config()

// ============ Environment ============
const CLIENT_ID = process.env['GOOGLE_CONTACTS_CLIENT_ID'] || process.env['GOOGLE_CLIENT_ID'] || ''
const CLIENT_SECRET = process.env['GOOGLE_CONTACTS_CLIENT_SECRET'] || process.env['GOOGLE_CLIENT_SECRET'] || ''
const REDIRECT_URI = process.env['GOOGLE_CONTACTS_REDIRECT_URI'] || 'http://localhost:3002/api/google-contacts/oauth2callback'
const ENCRYPTION_KEY = process.env['GOOGLE_TOKEN_ENCRYPTION_KEY'] || ''

const SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/userinfo.email'
]

const CONTACT_GROUP_NAME = 'Donation Platform'

const PERSON_FIELDS = 'names,nicknames,emailAddresses,phoneNumbers,addresses,biographies,relations,externalIds,userDefined,memberships'

// Rate-limit: max 1 sync per 5 minutes per user
const syncTimestamps = new Map<string, number>()

// ============ Encryption ============
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || !text) return text
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || !text || !text.includes(':')) return text
  const [ivHex, encrypted] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ============ OAuth2 Helpers ============
export function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function generateStateToken(userId: string): string {
  const payload = JSON.stringify({ userId, ts: Date.now() })
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET)
  hmac.update(payload)
  const sig = hmac.digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + sig
}

export function verifyStateToken(state: string): { userId: string; ts: number } | null {
  try {
    const [payloadB64, sig] = state.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString('utf8')
    const hmac = crypto.createHmac('sha256', CLIENT_SECRET)
    hmac.update(payload)
    const expectedSig = hmac.digest('hex')
    if (sig !== expectedSig) return null
    const parsed = JSON.parse(payload)
    // Expire after 10 minutes
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export async function getAuthenticatedClient(userId: string) {
  const auth = await remult.repo(GoogleAuth).findFirst({ userId, isActive: true })
  if (!auth) throw new Error('Google account not connected')

  const oauth2 = createOAuth2Client()
  oauth2.setCredentials({
    access_token: decrypt(auth.accessToken),
    refresh_token: decrypt(auth.refreshToken),
    expiry_date: auth.expiresAt
  })

  // Refresh if expired
  if (auth.expiresAt < Date.now() + 60_000) {
    const { credentials } = await oauth2.refreshAccessToken()
    auth.accessToken = encrypt(credentials.access_token || '')
    if (credentials.refresh_token) {
      auth.refreshToken = encrypt(credentials.refresh_token)
    }
    auth.expiresAt = credentials.expiry_date || 0
    await remult.repo(GoogleAuth).save(auth)
    oauth2.setCredentials(credentials)
  }

  return { oauth2, auth }
}

// ============ Contact Group ============
export async function getOrCreateContactGroup(peopleService: people_v1.People): Promise<string> {
  // List all contact groups
  const groups = await peopleService.contactGroups.list({ pageSize: 100 })
  const existing = groups.data.contactGroups?.find(
    g => g.name === CONTACT_GROUP_NAME && g.groupType === 'USER_CONTACT_GROUP'
  )
  if (existing?.resourceName) return existing.resourceName

  // Create new group
  const created = await peopleService.contactGroups.create({
    requestBody: { contactGroup: { name: CONTACT_GROUP_NAME } }
  })
  return created.data.resourceName!
}

// ============ Field Mapping: Donor → Google Person ============
export function donorToGooglePerson(
  donor: Donor,
  contacts: DonorContact[],
  primaryPlace?: { place?: Place },
  groupResourceName?: string
): people_v1.Schema$Person {
  const person: people_v1.Schema$Person = {
    names: [{
      givenName: donor.firstName || undefined,
      familyName: donor.lastName || undefined,
      honorificPrefix: donor.title || undefined
    }],
    userDefined: [
      { key: 'platformDonorId', value: donor.id }
    ]
  }

  if (donor.nickname) {
    person.nicknames = [{ value: donor.nickname }]
  }

  if (donor.wifeName) {
    person.relations = [{ person: donor.wifeName, type: 'spouse' }]
  }

  if (donor.notes) {
    person.biographies = [{ value: donor.notes, contentType: 'TEXT_PLAIN' }]
  }

  if (donor.idNumber) {
    person.externalIds = [{ value: donor.idNumber, type: 'custom', formattedType: 'ID Number' }]
  }

  // Phone numbers
  const phones = contacts.filter(c => c.type === 'phone' && c.isActive && c.phoneNumber)
  if (phones.length) {
    person.phoneNumbers = phones.map(p => ({
      value: p.phoneNumber,
      type: p.isPrimary ? 'main' : 'other'
    }))
  }

  // Emails
  const emails = contacts.filter(c => c.type === 'email' && c.isActive && c.email)
  if (emails.length) {
    person.emailAddresses = emails.map(e => ({
      value: e.email,
      type: e.isPrimary ? 'home' : 'other'
    }))
  }

  // Address
  if (primaryPlace?.place) {
    const place = primaryPlace.place
    person.addresses = [{
      streetAddress: place.getStreetLine() || undefined,
      city: place.city || undefined,
      region: place.state || undefined,
      postalCode: place.postcode || undefined,
      country: place.country?.nameEn || place.country?.name || undefined,
      type: 'home'
    }]
  }

  // Membership in contact group
  if (groupResourceName) {
    person.memberships = [{ contactGroupMembership: { contactGroupResourceName: groupResourceName } }]
  }

  return person
}

// ============ Field Mapping: Google Person → Donor fields ============
export function googlePersonToDonorFields(person: people_v1.Schema$Person) {
  const name = person.names?.[0]
  return {
    firstName: name?.givenName || '',
    lastName: name?.familyName || '',
    title: name?.honorificPrefix || '',
    nickname: person.nicknames?.[0]?.value || '',
    wifeName: person.relations?.find(r => r.type === 'spouse')?.person || '',
    notes: person.biographies?.[0]?.value || '',
    idNumber: person.externalIds?.find(e => e.type === 'custom')?.value || '',
    phones: (person.phoneNumbers || []).map(p => ({
      phoneNumber: p.value || '',
      isPrimary: p.type === 'main',
      type: 'phone' as const
    })),
    emails: (person.emailAddresses || []).map(e => ({
      email: e.value || '',
      isPrimary: e.type === 'home',
      type: 'email' as const
    })),
    address: person.addresses?.[0] ? {
      street: person.addresses[0].streetAddress || '',
      city: person.addresses[0].city || '',
      state: person.addresses[0].region || '',
      postcode: person.addresses[0].postalCode || '',
      country: person.addresses[0].country || ''
    } : null
  }
}

// ============ Hash Computation ============
export function computePlatformHash(donor: Donor, contacts: DonorContact[], place?: Place): string {
  const data = JSON.stringify({
    fn: donor.firstName, ln: donor.lastName, t: donor.title,
    nn: donor.nickname, wn: donor.wifeName, n: donor.notes, id: donor.idNumber,
    ph: contacts.filter(c => c.type === 'phone' && c.isActive).map(c => c.phoneNumber).sort(),
    em: contacts.filter(c => c.type === 'email' && c.isActive).map(c => c.email).sort(),
    addr: place ? `${place.street}|${place.city}|${place.state}|${place.postcode}` : ''
  })
  return crypto.createHash('md5').update(data).digest('hex')
}

export function computeGoogleHash(person: people_v1.Schema$Person): string {
  const data = JSON.stringify({
    fn: person.names?.[0]?.givenName, ln: person.names?.[0]?.familyName,
    t: person.names?.[0]?.honorificPrefix,
    nn: person.nicknames?.[0]?.value,
    wn: person.relations?.find(r => r.type === 'spouse')?.person,
    n: person.biographies?.[0]?.value,
    id: person.externalIds?.find(e => e.type === 'custom')?.value,
    ph: (person.phoneNumbers || []).map(p => p.value).sort(),
    em: (person.emailAddresses || []).map(e => e.value).sort(),
    addr: person.addresses?.[0] ? `${person.addresses[0].streetAddress}|${person.addresses[0].city}|${person.addresses[0].region}|${person.addresses[0].postalCode}` : ''
  })
  return crypto.createHash('md5').update(data).digest('hex')
}

// ============ People API helpers ============
export async function fetchAllGroupContacts(
  peopleService: people_v1.People,
  groupResourceName: string
): Promise<people_v1.Schema$Person[]> {
  // Get members of the group
  const group = await peopleService.contactGroups.get({
    resourceName: groupResourceName,
    maxMembers: 10000
  })
  const memberResourceNames = group.data.memberResourceNames || []
  if (!memberResourceNames.length) return []

  // Batch-get people (max 200 per request)
  const people: people_v1.Schema$Person[] = []
  for (let i = 0; i < memberResourceNames.length; i += 200) {
    const batch = memberResourceNames.slice(i, i + 200)
    const res = await peopleService.people.getBatchGet({
      resourceNames: batch,
      personFields: PERSON_FIELDS
    })
    if (res.data.responses) {
      for (const r of res.data.responses) {
        if (r.person) people.push(r.person)
      }
    }
  }
  return people
}

export function getPlatformDonorId(person: people_v1.Schema$Person): string | undefined {
  return person.userDefined?.find(u => u.key === 'platformDonorId')?.value || undefined
}

// ============ Register Delegates ============
GoogleContactsController.getAuthUrlDelegate = async (userId: string) => {
  const oauth2 = createOAuth2Client()
  const state = generateStateToken(userId)
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state
  })
}

GoogleContactsController.handleCallbackDelegate = async (userId: string, code: string, state: string) => {
  const stateData = verifyStateToken(state)
  if (!stateData || stateData.userId !== userId) {
    throw new Error('Invalid or expired state token')
  }

  const oauth2 = createOAuth2Client()
  const { tokens } = await oauth2.getToken(code)

  // Get user email
  oauth2.setCredentials(tokens)
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
  const userInfo = await oauth2Api.userinfo.get()
  const email = userInfo.data.email || ''

  // Upsert GoogleAuth
  let auth = await remult.repo(GoogleAuth).findFirst({ userId })
  if (!auth) {
    auth = remult.repo(GoogleAuth).create()
    auth.userId = userId
  }
  auth.accessToken = encrypt(tokens.access_token || '')
  auth.refreshToken = encrypt(tokens.refresh_token || '')
  auth.expiresAt = tokens.expiry_date || 0
  auth.googleEmail = email
  auth.isActive = true
  await remult.repo(GoogleAuth).save(auth)

  return true
}

GoogleContactsController.triggerSyncDelegate = async (userId: string, options: SyncOptions, syncType: SyncType) => {
  // Rate limit check
  const lastSync = syncTimestamps.get(userId)
  if (lastSync && Date.now() - lastSync < 5 * 60 * 1000) {
    return {
      success: false,
      donorsPushed: 0, contactsPulled: 0, conflicts: 0, errors: 1,
      errorDetails: ['Rate limit: please wait 5 minutes between syncs'],
      conflictDetails: [], duration: 0
    } as SyncResult
  }
  syncTimestamps.set(userId, Date.now())

  return runSync(userId, options, syncType)
}

GoogleContactsController.getStatusDelegate = async (userId: string): Promise<GoogleAuthStatus> => {
  const auth = await remult.repo(GoogleAuth).findFirst({ userId, isActive: true })
  if (!auth) return { isConnected: false }

  const lastMapping = await remult.repo(GoogleContactMapping).findFirst(
    { userId, syncStatus: 'synced' },
    { orderBy: { lastSyncedAt: 'desc' } }
  )

  return {
    isConnected: true,
    googleEmail: auth.googleEmail,
    lastSyncedAt: lastMapping?.lastSyncedAt
  }
}

GoogleContactsController.disconnectDelegate = async (userId: string) => {
  const auth = await remult.repo(GoogleAuth).findFirst({ userId, isActive: true })
  if (auth) {
    // Revoke token at Google
    try {
      const oauth2 = createOAuth2Client()
      const accessToken = decrypt(auth.accessToken)
      if (accessToken) {
        await oauth2.revokeToken(accessToken)
      }
    } catch (err) {
      console.warn('[GoogleContacts] Token revocation failed (may already be revoked):', err)
    }

    auth.isActive = false
    auth.accessToken = ''
    auth.refreshToken = ''
    await remult.repo(GoogleAuth).save(auth)
  }

  // Clear mappings
  const mappings = await remult.repo(GoogleContactMapping).find({ where: { userId } })
  for (const m of mappings) {
    await remult.repo(GoogleContactMapping).delete(m)
  }
}

GoogleContactsController.getSyncLogsDelegate = async (userId: string, limit: number) => {
  const logs = await remult.repo(GoogleSyncLog).find({
    where: { userId },
    orderBy: { createdDate: 'desc' },
    limit: Math.min(limit, 50)
  })
  return logs.map(l => ({
    id: l.id,
    syncType: l.syncType,
    status: l.status,
    donorsPushed: l.donorsPushed,
    contactsPulled: l.contactsPulled,
    conflicts: l.conflicts,
    errors: l.errors,
    duration: l.duration,
    createdDate: l.createdDate
  }))
}

console.info('[GoogleContacts] Delegates registered successfully.')
