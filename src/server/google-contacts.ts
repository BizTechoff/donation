import { config } from 'dotenv'
import crypto from 'crypto'
import { google, people_v1 } from 'googleapis'
import { remult, withRemult } from 'remult'
import { GoogleContactsController } from '../shared/controllers/google-contacts.controller'
import { GoogleAuth } from '../shared/entity/google-auth'
import { GoogleContactMapping } from '../shared/entity/google-contact-mapping'
import { GoogleSyncLog } from '../shared/entity/google-sync-log'
import { Donor } from '../shared/entity/donor'
import { DonorContact } from '../shared/entity/donor-contact'
import { DonorPlace } from '../shared/entity/donor-place'
import { DonorEvent } from '../shared/entity/donor-event'
import { DonorReceptionHour } from '../shared/entity/donor-reception-hour'
import { DonorNote } from '../shared/entity/donor-note'
import { Place } from '../shared/entity/place'
import { GoogleAuthStatus, SyncOptions, SyncProgress, SyncResult, SyncStartResult, SyncType } from '../shared/type/google-contacts.type'
import { rootDataProvider } from './api'
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

const CONTACT_GROUP_NAME = 'YYG Platform'

const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,addresses,birthdays,events,userDefined,relations,organizations,biographies,memberships,metadata'

// Rate-limit: max 1 sync per 5 minutes per user
const syncTimestamps = new Map<string, number>()

// Cancellation tracking
const cancelledSyncs = new Set<string>()

export function isSyncCancelled(logId: string): boolean {
  return cancelledSyncs.has(logId)
}

export function clearCancelledSync(logId: string) {
  cancelledSyncs.delete(logId)
}

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

// ============ Phone formatting ============
function toInternationalPhone(phone: string, prefix: string): string {
  if (!phone) return phone
  // Already international format
  if (phone.startsWith('+')) return phone
  // Strip non-digits
  const digits = phone.replace(/\D/g, '')
  // Israeli number: 0XX → +972XX
  if (prefix === '+972' && digits.startsWith('0')) {
    return '+972' + digits.substring(1)
  }
  // Other countries: prepend prefix
  return prefix + digits
}

// ============ Event type detection ============
const BIRTHDAY_PATTERNS = ['יום הולדת', 'הולדת', 'birthday']
const ANNIVERSARY_PATTERNS = ['יום נישואין', 'נישואין', 'anniversary']

function isEventType(description: string, patterns: string[]): boolean {
  const lower = description.toLowerCase()
  return patterns.some(p => lower.includes(p))
}

function dateToGoogleDate(d: Date): { year?: number; month?: number; day?: number } {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ============ Relationship type mapping (Hebrew → Google) ============
const RELATION_TYPE_MAP: { [key: string]: string } = {
  'אישה': 'spouse', 'בעל': 'spouse',
  'בן': 'child', 'בת': 'child',
  'אב': 'parent', 'אם': 'parent',
  'אח': 'brother', 'אחות': 'sister',
  'סבא': 'parent', 'סבתא': 'parent',
  'נכד': 'child', 'נכדה': 'child',
  'דוד': 'relative', 'דודה': 'relative',
  'חתן': 'relative', 'כלה': 'relative',
  'חותן': 'parent', 'חותנת': 'parent',
  'גיס': 'relative', 'גיסה': 'relative',
}

// ============ Field Mapping: Donor → Google Person ============
export function donorToGooglePerson(
  donor: Donor,
  contacts: DonorContact[],
  primaryPlace?: { place?: Place },
  groupResourceName?: string,
  events?: DonorEvent[],
  receptionHours?: DonorReceptionHour[],
  relations?: Array<{ name: string; type: string }>,
  orgNames?: string[],
  notes?: DonorNote[]
): people_v1.Schema$Person {
  const person: people_v1.Schema$Person = {
    names: [{
      givenName: donor.firstName || undefined,
      familyName: donor.lastName || undefined
    }],
    userDefined: [
      { key: 'platformDonorId', value: donor.id }
    ]
  }

  // Phone numbers - send in international format so Google recognizes the country
  const phones = contacts.filter(c => c.type === 'phone' && c.isActive && c.phoneNumber)
  if (phones.length) {
    person.phoneNumbers = phones.map(p => ({
      value: toInternationalPhone(p.phoneNumber!, p.prefix || '+972'),
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

  // Address - fill all Google address fields
  if (primaryPlace?.place) {
    const place = primaryPlace.place
    const lines = place.getAddressForLetter()

    // Extended address: apartment/building line (UK/GB) or neighborhood
    const apartmentLine = place.getApartmentLine()
    const extendedParts: string[] = []
    if (apartmentLine) extendedParts.push(apartmentLine)
    if (place.neighborhood) extendedParts.push(place.neighborhood)

    person.addresses = [{
      formattedValue: lines.join('\n'),
      streetAddress: place.getStreetLine() || undefined,
      extendedAddress: extendedParts.length ? extendedParts.join(', ') : undefined,
      city: place.city || undefined,
      region: place.state || undefined,
      postalCode: place.postcode || undefined,
      country: place.country?.nameEn || place.country?.name || undefined,
      type: 'home'
    }]
  }

  // Notes (DonorNote) → biographies
  if (notes?.length) {
    const notesText = notes
      .map(n => n.noteType ? `[${n.noteType}]: ${n.content || ''}` : (n.content || ''))
      .join('\n')
    if (notesText.trim()) {
      person.biographies = [{ value: notesText, contentType: 'TEXT_PLAIN' }]
    }
  }

  // Events: birthday → birthdays, anniversary → events, others → events with description
  if (events?.length) {
    const googleEvents: Array<{ date: any; type?: string; formattedType?: string }> = []

    for (const de of events) {
      if (!de.date || !de.event?.description) continue
      const desc = de.event.description
      const gDate = dateToGoogleDate(de.date)

      if (isEventType(desc, BIRTHDAY_PATTERNS)) {
        person.birthdays = [{ date: gDate }]
      } else if (isEventType(desc, ANNIVERSARY_PATTERNS)) {
        googleEvents.push({ date: gDate, formattedType: desc })
      } else {
        googleEvents.push({ date: gDate, formattedType: desc })
      }
    }

    if (googleEvents.length) {
      person.events = googleEvents
    }
  }

  // Reception hours → userDefined
  if (receptionHours?.length) {
    const hoursText = receptionHours
      .map(rh => `${rh.startTime}-${rh.endTime}${rh.description ? ' (' + rh.description + ')' : ''}`)
      .join(', ')
    person.userDefined!.push({ key: 'שעות קבלה', value: hoursText })
  }

  // Relations (family)
  if (relations?.length) {
    person.relations = relations.map(r => ({
      person: r.name,
      type: RELATION_TYPE_MAP[r.type] || 'relative',
      formattedType: RELATION_TYPE_MAP[r.type] ? undefined : r.type
    }))
  }

  // Organizations (companies + organizations)
  if (orgNames?.length) {
    person.organizations = orgNames.map(name => ({
      name,
      type: 'work'
    }))
  }

  // Membership in contact group
  if (groupResourceName) {
    person.memberships = [{ contactGroupMembership: { contactGroupResourceName: groupResourceName } }]
  }

  return person
}

// ============ Phone/Email type mapping (Google → Hebrew) ============
const GOOGLE_PHONE_TYPE_MAP: { [key: string]: string } = {
  'main': 'ראשי', 'mobile': 'נייד', 'home': 'בית', 'work': 'עבודה',
  'homeFax': 'פקס בית', 'workFax': 'פקס עבודה', 'pager': 'זימונית', 'other': 'אחר'
}
const GOOGLE_EMAIL_TYPE_MAP: { [key: string]: string } = {
  'home': 'בית', 'work': 'עבודה', 'other': 'אחר'
}

// ============ Field Mapping: Google Person → Donor fields ============
export function googlePersonToDonorFields(person: people_v1.Schema$Person) {
  const name = person.names?.[0]
  return {
    firstName: name?.givenName || '',
    lastName: name?.familyName || '',
    phones: (person.phoneNumbers || []).map(p => ({
      phoneNumber: p.value || '',
      isPrimary: p.type === 'main',
      description: GOOGLE_PHONE_TYPE_MAP[p.type || ''] || p.formattedType || '',
      type: 'phone' as const
    })),
    emails: (person.emailAddresses || []).map(e => ({
      email: e.value || '',
      isPrimary: e.type === 'home',
      description: GOOGLE_EMAIL_TYPE_MAP[e.type || ''] || e.formattedType || '',
      type: 'email' as const
    })),
    addresses: (person.addresses || []).map(a => ({
      street: a.streetAddress || '',
      city: a.city || '',
      state: a.region || '',
      postcode: a.postalCode || '',
      country: a.country || '',
      extendedAddress: a.extendedAddress || '',
      type: a.type || 'home'
    })),
    events: [
      ...(person.birthdays || []).filter(b => b.date).map(b => ({
        description: 'יום הולדת',
        date: b.date!
      })),
      ...(person.events || []).filter(e => e.date).map(e => ({
        description: e.formattedType || e.type || 'אירוע',
        date: e.date!
      }))
    ] as Array<{ description: string; date: { year?: number | null; month?: number | null; day?: number | null } }>,
    relations: (person.relations || []).map(r => ({
      name: r.person || '',
      type: r.type || 'relative'
    })),
    orgNames: (person.organizations || []).map(o => o.name || '').filter(Boolean),
    notes: parseGoogleNotes(person.biographies?.[0]?.value || '')
  }
}

function parseGoogleNotes(text: string): Array<{ noteType: string; content: string }> {
  if (!text) return []
  return text.split('\n').filter(l => l.trim()).map(line => {
    const match = line.match(/^\[(.+?)\]:\s*(.*)$/)
    if (match) return { noteType: match[1], content: match[2] }
    return { noteType: '', content: line }
  })
}

// ============ Hash Computation ============
export function computePlatformHash(
  donor: Donor, contacts: DonorContact[], place?: Place,
  events?: DonorEvent[], receptionHours?: DonorReceptionHour[],
  relations?: Array<{ name: string; type: string }>,
  orgNames?: string[],
  donorNotes?: DonorNote[]
): string {
  const data = JSON.stringify({
    fn: donor.firstName, ln: donor.lastName,
    ph: contacts.filter(c => c.type === 'phone' && c.isActive).map(c => c.phoneNumber).sort(),
    em: contacts.filter(c => c.type === 'email' && c.isActive).map(c => c.email).sort(),
    addr: place ? `${place.street}|${place.city}|${place.state}|${place.postcode}|${place.neighborhood}|${place.apartment}` : '',
    ev: (events || []).filter(e => e.isActive && e.date).map(e => `${e.eventId}|${e.date?.toISOString()}`).sort(),
    rh: (receptionHours || []).filter(r => r.isActive).map(r => `${r.startTime}-${r.endTime}`).sort(),
    rel: (relations || []).map(r => `${r.name}|${r.type}`).sort(),
    org: (orgNames || []).sort(),
    notes: (donorNotes || []).map(n => `${n.noteType}|${n.content}`).sort().join(';')
  })
  return crypto.createHash('md5').update(data).digest('hex')
}

export function computeGoogleHash(person: people_v1.Schema$Person): string {
  const data = JSON.stringify({
    fn: person.names?.[0]?.givenName, ln: person.names?.[0]?.familyName,
    ph: (person.phoneNumbers || []).map(p => p.value).sort(),
    em: (person.emailAddresses || []).map(e => e.value).sort(),
    addr: person.addresses?.[0] ? `${person.addresses[0].streetAddress}|${person.addresses[0].city}|${person.addresses[0].region}|${person.addresses[0].postalCode}|${person.addresses[0].extendedAddress}` : '',
    bd: person.birthdays?.[0]?.date ? `${person.birthdays[0].date.year}-${person.birthdays[0].date.month}-${person.birthdays[0].date.day}` : '',
    ev: (person.events || []).map(e => `${e.formattedType || e.type}|${e.date?.year}-${e.date?.month}-${e.date?.day}`).sort(),
    rel: (person.relations || []).map(r => `${r.person}|${r.type}`).sort(),
    org: (person.organizations || []).map(o => o.name).sort(),
    notes: person.biographies?.[0]?.value || ''
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

GoogleContactsController.triggerSyncDelegate = async (userId: string, options: SyncOptions, syncType: SyncType): Promise<SyncStartResult> => {
  // Rate limit check
  const lastSync = syncTimestamps.get(userId)
  if (lastSync && Date.now() - lastSync < 5 * 60 * 1000) {
    return { logId: '', started: false, message: 'נא להמתין 5 דקות בין סנכרונים' }
  }
  syncTimestamps.set(userId, Date.now())

  // Create log entry in current request context
  const log = remult.repo(GoogleSyncLog).create()
  log.userId = userId
  log.syncType = syncType
  log.status = 'started'
  await remult.repo(GoogleSyncLog).save(log)

  // Fire and forget - sync runs in background with root (non-transactional) dataProvider
  withRemult(async () => {
    await runSync(userId, options, syncType, log.id)
  }, { dataProvider: rootDataProvider }).catch(err => {
    console.error('[GoogleContacts] Background sync error:', err)
  })

  return { logId: log.id, started: true, message: 'הסנכרון התחיל' }
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
  // Auto-fail stuck syncs (older than 10 minutes)
  const stuckLogs = await remult.repo(GoogleSyncLog).find({
    where: { userId, status: 'started' }
  })
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  for (const sl of stuckLogs) {
    if (sl.createdDate.getTime() < tenMinutesAgo) {
      sl.status = 'failed'
      sl.errorDetails = ['Sync timed out']
      await remult.repo(GoogleSyncLog).save(sl)
    }
  }

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

GoogleContactsController.getSyncProgressDelegate = async (logId: string, userId: string): Promise<SyncProgress> => {
  const log = await remult.repo(GoogleSyncLog).findId(logId)
  if (!log || log.userId !== userId) {
    return { logId, status: 'failed', donorsPushed: 0, contactsPulled: 0, conflicts: 0, errors: 1, duration: 0, errorDetails: ['Log not found'] }
  }
  return {
    logId: log.id,
    status: log.status,
    donorsPushed: log.donorsPushed,
    contactsPulled: log.contactsPulled,
    conflicts: log.conflicts,
    errors: log.errors,
    duration: log.duration,
    errorDetails: log.errorDetails
  }
}

GoogleContactsController.cancelSyncDelegate = async (logId: string, userId: string) => {
  const log = await remult.repo(GoogleSyncLog).findId(logId)
  if (!log || log.userId !== userId) return
  if (log.status !== 'started') return

  // Mark as cancelled
  cancelledSyncs.add(logId)
  log.status = 'failed'
  log.errorDetails = ['בוטל ע"י המשתמש']
  log.duration = Date.now() - (log.createdDate?.getTime() || Date.now())
  await remult.repo(GoogleSyncLog).save(log)

  // Reset rate limit so user can restart immediately
  syncTimestamps.delete(userId)
}

console.info('[GoogleContacts] Delegates registered successfully.')
