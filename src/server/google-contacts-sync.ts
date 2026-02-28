import { google, people_v1 } from 'googleapis'
import { remult } from 'remult'
import { Donor } from '../shared/entity/donor'
import { DonorContact } from '../shared/entity/donor-contact'
import { DonorPlace } from '../shared/entity/donor-place'
import { GoogleContactMapping } from '../shared/entity/google-contact-mapping'
import { GoogleSyncLog } from '../shared/entity/google-sync-log'
import { SyncConflict, SyncOptions, SyncResult, SyncType } from '../shared/type/google-contacts.type'
import {
  computeGoogleHash,
  computePlatformHash,
  donorToGooglePerson,
  fetchAllGroupContacts,
  getAuthenticatedClient,
  getOrCreateContactGroup,
  getPlatformDonorId,
  googlePersonToDonorFields
} from './google-contacts'

const PERSON_FIELDS = 'names,nicknames,emailAddresses,phoneNumbers,addresses,biographies,relations,externalIds,userDefined,memberships,metadata'

// Throttle: wait between mutations to respect Google quota (~60/min)
const THROTTLE_MS = 1100

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runSync(
  userId: string,
  options: SyncOptions,
  syncType: SyncType
): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: false, donorsPushed: 0, contactsPulled: 0,
    conflicts: 0, errors: 0, errorDetails: [], conflictDetails: [], duration: 0
  }

  // Create sync log
  const log = remult.repo(GoogleSyncLog).create()
  log.userId = userId
  log.syncType = syncType
  log.status = 'started'
  await remult.repo(GoogleSyncLog).save(log)

  try {
    // 1. PREPARATION
    const { oauth2 } = await getAuthenticatedClient(userId)
    const peopleService = google.people({ version: 'v1', auth: oauth2 })

    const groupResourceName = await getOrCreateContactGroup(peopleService)

    // Load all mappings for this user
    const mappings = await remult.repo(GoogleContactMapping).find({ where: { userId } })
    const mappingByDonorId = new Map(mappings.map(m => [m.donorId, m]))
    const mappingByGoogleRN = new Map(mappings.map(m => [m.googleResourceName, m]))

    // Load all donors from the platform
    const donors = await remult.repo(Donor).find({ where: { isActive: true } })
    const donorMap = new Map(donors.map(d => [d.id, d]))

    // Load contacts for all donors
    const allContacts = await remult.repo(DonorContact).find({
      where: { donorId: { $in: donors.map(d => d.id) }, isActive: true }
    })
    const contactsByDonor = new Map<string, DonorContact[]>()
    for (const c of allContacts) {
      if (!c.donorId) continue
      if (!contactsByDonor.has(c.donorId)) contactsByDonor.set(c.donorId, [])
      contactsByDonor.get(c.donorId)!.push(c)
    }

    // Load primary places for all donors
    const primaryPlaces = await DonorPlace.getPrimaryForDonors(donors.map(d => d.id))

    // Fetch Google contacts from the group
    const googleContacts = await fetchAllGroupContacts(peopleService, groupResourceName)
    const googleByRN = new Map<string, people_v1.Schema$Person>()
    for (const gc of googleContacts) {
      if (gc.resourceName) googleByRN.set(gc.resourceName, gc)
    }

    // 2. CHANGE DETECTION for existing mappings
    for (const mapping of mappings) {
      try {
        const donor = donorMap.get(mapping.donorId)
        const googlePerson = googleByRN.get(mapping.googleResourceName)

        // If donor was deleted, skip (could delete from Google too)
        if (!donor) {
          mapping.syncStatus = 'error'
          await remult.repo(GoogleContactMapping).save(mapping)
          continue
        }

        // If Google contact was deleted externally
        if (!googlePerson) {
          // Re-create in Google
          await pushDonorToGoogle(
            peopleService, donor,
            contactsByDonor.get(donor.id) || [],
            primaryPlaces.get(donor.id),
            groupResourceName, mapping, result
          )
          await sleep(THROTTLE_MS)
          continue
        }

        // Compute hashes
        const currentPlatformHash = computePlatformHash(
          donor,
          contactsByDonor.get(donor.id) || [],
          primaryPlaces.get(donor.id)?.place
        )
        const currentGoogleHash = computeGoogleHash(googlePerson)

        const platformChanged = currentPlatformHash !== mapping.platformHash
        const googleChanged = currentGoogleHash !== mapping.googleHash

        if (!platformChanged && !googleChanged) {
          // No changes - skip
          continue
        }

        if (platformChanged && !googleChanged) {
          // PUSH: platform → Google
          await pushDonorToGoogle(
            peopleService, donor,
            contactsByDonor.get(donor.id) || [],
            primaryPlaces.get(donor.id),
            groupResourceName, mapping, result
          )
          await sleep(THROTTLE_MS)
        } else if (!platformChanged && googleChanged) {
          // PULL: Google → platform
          await pullGoogleToPlatform(
            donor, googlePerson, mapping,
            contactsByDonor.get(donor.id) || [],
            result
          )
        } else {
          // CONFLICT: both changed
          await handleConflict(
            peopleService, donor, googlePerson, mapping,
            contactsByDonor.get(donor.id) || [],
            primaryPlaces.get(donor.id),
            groupResourceName, options, result
          )
          await sleep(THROTTLE_MS)
        }

        // Remove from maps so we know what's "new"
        googleByRN.delete(mapping.googleResourceName)

      } catch (err: any) {
        result.errors++
        result.errorDetails.push(`Mapping ${mapping.donorId}: ${err.message}`)
      }
    }

    // 3. NEW ITEMS

    // Donors without mapping → create in Google
    for (const donor of donors) {
      if (mappingByDonorId.has(donor.id)) continue
      try {
        const mapping = remult.repo(GoogleContactMapping).create()
        mapping.userId = userId
        mapping.donorId = donor.id

        await pushDonorToGoogle(
          peopleService, donor,
          contactsByDonor.get(donor.id) || [],
          primaryPlaces.get(donor.id),
          groupResourceName, mapping, result
        )
        await sleep(THROTTLE_MS)
      } catch (err: any) {
        result.errors++
        result.errorDetails.push(`New push ${donor.id}: ${err.message}`)
      }
    }

    // Google contacts without mapping → create donor in platform
    for (const [rn, person] of googleByRN) {
      if (mappingByGoogleRN.has(rn)) continue
      // Check if this contact has a platformDonorId (was created by us but mapping lost)
      const existingDonorId = getPlatformDonorId(person)
      if (existingDonorId && donorMap.has(existingDonorId)) continue

      try {
        await pullNewContactToPlatform(userId, person, rn, result)
      } catch (err: any) {
        result.errors++
        result.errorDetails.push(`New pull ${rn}: ${err.message}`)
      }
    }

    result.success = true
    log.status = 'completed'
  } catch (err: any) {
    result.errors++
    result.errorDetails.push(`Sync failed: ${err.message}`)
    log.status = 'failed'
    log.errorDetails = result.errorDetails
  }

  // Update log
  result.duration = Date.now() - startTime
  log.donorsPushed = result.donorsPushed
  log.contactsPulled = result.contactsPulled
  log.conflicts = result.conflicts
  log.errors = result.errors
  log.duration = result.duration
  await remult.repo(GoogleSyncLog).save(log)

  return result
}

// ============ Push: Platform → Google ============
async function pushDonorToGoogle(
  peopleService: people_v1.People,
  donor: Donor,
  contacts: DonorContact[],
  primaryDonorPlace: DonorPlace | undefined,
  groupResourceName: string,
  mapping: GoogleContactMapping,
  result: SyncResult
) {
  const personData = donorToGooglePerson(donor, contacts, primaryDonorPlace, groupResourceName)

  let created: people_v1.Schema$Person
  if (mapping.googleResourceName) {
    // Update existing
    created = (await peopleService.people.updateContact({
      resourceName: mapping.googleResourceName,
      updatePersonFields: 'names,nicknames,emailAddresses,phoneNumbers,addresses,biographies,relations,externalIds,userDefined',
      requestBody: { ...personData, etag: mapping.googleEtag || undefined }
    })).data
  } else {
    // Create new
    created = (await peopleService.people.createContact({
      personFields: PERSON_FIELDS,
      requestBody: personData
    })).data

    // Add to group if not already
    if (created.resourceName) {
      try {
        await peopleService.contactGroups.members.modify({
          resourceName: groupResourceName,
          requestBody: { resourceNamesToAdd: [created.resourceName] }
        })
      } catch {
        // May already be in group
      }
    }
  }

  // Update mapping
  mapping.googleResourceName = created.resourceName || ''
  mapping.googleEtag = created.etag || ''
  mapping.platformHash = computePlatformHash(donor, contacts, primaryDonorPlace?.place)
  mapping.googleHash = computeGoogleHash(created)
  mapping.syncStatus = 'synced'
  mapping.lastSyncedAt = new Date()
  await remult.repo(GoogleContactMapping).save(mapping)

  result.donorsPushed++
}

// ============ Pull: Google → Platform (update existing donor) ============
async function pullGoogleToPlatform(
  donor: Donor,
  person: people_v1.Schema$Person,
  mapping: GoogleContactMapping,
  existingContacts: DonorContact[],
  result: SyncResult
) {
  const fields = googlePersonToDonorFields(person)

  // Update donor fields
  donor.firstName = fields.firstName || donor.firstName
  donor.lastName = fields.lastName || donor.lastName
  donor.title = fields.title || donor.title
  donor.nickname = fields.nickname
  donor.wifeName = fields.wifeName
  donor.notes = fields.notes
  donor.idNumber = fields.idNumber || donor.idNumber
  await remult.repo(Donor).save(donor)

  // Sync phone contacts
  await syncContacts(donor.id!, fields.phones, existingContacts.filter(c => c.type === 'phone'), 'phone')

  // Sync email contacts
  await syncContacts(donor.id!, fields.emails, existingContacts.filter(c => c.type === 'email'), 'email')

  // Update mapping hashes
  mapping.platformHash = computePlatformHash(
    donor,
    await remult.repo(DonorContact).find({ where: { donorId: donor.id, isActive: true } }),
    undefined // place not changed from Google
  )
  mapping.googleHash = computeGoogleHash(person)
  mapping.googleEtag = person.etag || ''
  mapping.syncStatus = 'synced'
  mapping.lastSyncedAt = new Date()
  await remult.repo(GoogleContactMapping).save(mapping)

  result.contactsPulled++
}

// ============ Pull new: Google → Platform (create new donor) ============
async function pullNewContactToPlatform(
  userId: string,
  person: people_v1.Schema$Person,
  googleResourceName: string,
  result: SyncResult
) {
  const fields = googlePersonToDonorFields(person)

  // Only create if we have at least a last name
  if (!fields.lastName) return

  // Create new donor
  const donor = remult.repo(Donor).create()
  donor.firstName = fields.firstName
  donor.lastName = fields.lastName
  donor.title = fields.title
  donor.nickname = fields.nickname
  donor.wifeName = fields.wifeName
  donor.notes = fields.notes
  donor.idNumber = fields.idNumber
  const saved = await remult.repo(Donor).save(donor)

  // Create contacts
  for (const phone of fields.phones) {
    if (!phone.phoneNumber) continue
    const dc = remult.repo(DonorContact).create()
    dc.donorId = saved.id
    dc.type = 'phone'
    dc.phoneNumber = phone.phoneNumber
    dc.isPrimary = phone.isPrimary
    await remult.repo(DonorContact).save(dc)
  }
  for (const email of fields.emails) {
    if (!email.email) continue
    const dc = remult.repo(DonorContact).create()
    dc.donorId = saved.id
    dc.type = 'email'
    dc.email = email.email
    dc.isPrimary = email.isPrimary
    await remult.repo(DonorContact).save(dc)
  }

  // Create mapping
  const mapping = remult.repo(GoogleContactMapping).create()
  mapping.userId = userId
  mapping.donorId = saved.id
  mapping.googleResourceName = googleResourceName
  mapping.googleEtag = person.etag || ''
  const allContacts = await remult.repo(DonorContact).find({
    where: { donorId: saved.id, isActive: true }
  })
  mapping.platformHash = computePlatformHash(saved, allContacts)
  mapping.googleHash = computeGoogleHash(person)
  mapping.syncStatus = 'synced'
  mapping.lastSyncedAt = new Date()
  await remult.repo(GoogleContactMapping).save(mapping)

  result.contactsPulled++
}

// ============ Conflict Handling ============
async function handleConflict(
  peopleService: people_v1.People,
  donor: Donor,
  person: people_v1.Schema$Person,
  mapping: GoogleContactMapping,
  contacts: DonorContact[],
  primaryDonorPlace: DonorPlace | undefined,
  groupResourceName: string,
  options: SyncOptions,
  result: SyncResult
) {
  const resolution = options.conflictResolution || 'platform_wins'

  if (resolution === 'manual') {
    // Mark as conflict for manual resolution in UI
    mapping.syncStatus = 'conflict'
    await remult.repo(GoogleContactMapping).save(mapping)

    result.conflicts++
    result.conflictDetails.push({
      donorId: donor.id,
      donorName: donor.fullName || `${donor.firstName} ${donor.lastName}`,
      googleResourceName: mapping.googleResourceName,
      field: 'multiple',
      platformValue: '(platform version)',
      googleValue: '(google version)'
    })
    return
  }

  if (resolution === 'platform_wins') {
    await pushDonorToGoogle(peopleService, donor, contacts, primaryDonorPlace, groupResourceName, mapping, result)
  } else if (resolution === 'google_wins') {
    await pullGoogleToPlatform(donor, person, mapping, contacts, result)
  } else if (resolution === 'newest_wins') {
    // Compare update times
    const metadataArr = person.metadata as any[]
    const googleModified = metadataArr?.[0]?.source?.updateTime
    const platformModified = donor.updatedDate?.getTime() || 0
    const googleTime = googleModified ? new Date(googleModified).getTime() : 0

    if (platformModified >= googleTime) {
      await pushDonorToGoogle(peopleService, donor, contacts, primaryDonorPlace, groupResourceName, mapping, result)
    } else {
      await pullGoogleToPlatform(donor, person, mapping, contacts, result)
    }
  }
}

// ============ Contact Sync Helper ============
async function syncContacts(
  donorId: string,
  incoming: Array<{ phoneNumber?: string; email?: string; isPrimary: boolean; type: 'phone' | 'email' }>,
  existing: DonorContact[],
  contactType: 'phone' | 'email'
) {
  const valueField = contactType === 'phone' ? 'phoneNumber' : 'email'

  // Build set of existing values
  const existingValues = new Set(existing.map(c => contactType === 'phone' ? c.phoneNumber : c.email))

  // Add new contacts
  for (const item of incoming) {
    const value = contactType === 'phone' ? item.phoneNumber : item.email
    if (!value || existingValues.has(value)) continue

    const dc = remult.repo(DonorContact).create()
    dc.donorId = donorId
    dc.type = contactType
    if (contactType === 'phone') dc.phoneNumber = value
    else dc.email = value
    dc.isPrimary = item.isPrimary
    await remult.repo(DonorContact).save(dc)
  }
}
