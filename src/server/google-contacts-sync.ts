import { google, people_v1 } from 'googleapis'
import { remult } from 'remult'
import { Donor } from '../shared/entity/donor'
import { DonorContact } from '../shared/entity/donor-contact'
import { DonorEvent } from '../shared/entity/donor-event'
import { DonorPlace } from '../shared/entity/donor-place'
import { DonorReceptionHour } from '../shared/entity/donor-reception-hour'
import { DonorNote } from '../shared/entity/donor-note'
import { DonorRelation } from '../shared/entity/donor-relation'
import { Place } from '../shared/entity/place'
import { Event } from '../shared/entity/event'
import { Country } from '../shared/entity/country'
import { Company } from '../shared/entity/company'
import { Organization } from '../shared/entity/organization'
import { Donation } from '../shared/entity/donation'
import { DonationOrganization } from '../shared/entity/donation-organization'
import { GoogleContactMapping } from '../shared/entity/google-contact-mapping'
import { GoogleSyncLog } from '../shared/entity/google-sync-log'
import { SyncConflict, SyncOptions, SyncResult, SyncType } from '../shared/type/google-contacts.type'
import {
  clearCancelledSync,
  computeGoogleHash,
  computePlatformHash,
  donorToGooglePerson,
  fetchAllGroupContacts,
  getAuthenticatedClient,
  getOrCreateContactGroup,
  getPlatformDonorId,
  googlePersonToDonorFields,
  isSyncCancelled
} from './google-contacts'

const PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,addresses,birthdays,events,userDefined,relations,organizations,biographies,memberships,metadata'
const BATCH_SIZE = 200

async function updateLog(logId: string, result: SyncResult) {
  try {
    const log = await remult.repo(GoogleSyncLog).findId(logId)
    if (log) {
      log.donorsPushed = result.donorsPushed
      log.contactsPulled = result.contactsPulled
      log.conflicts = result.conflicts
      log.errors = result.errors
      log.duration = Date.now() - (log.createdDate?.getTime() || Date.now())
      await remult.repo(GoogleSyncLog).save(log)
    }
  } catch { /* don't fail sync for log update errors */ }
}

export async function runSync(
  userId: string,
  options: SyncOptions,
  syncType: SyncType,
  logId: string
): Promise<SyncResult> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: false, donorsPushed: 0, contactsPulled: 0,
    conflicts: 0, errors: 0, errorDetails: [], conflictDetails: [], duration: 0
  }

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

    // Load events for all donors
    const allEvents = await remult.repo(DonorEvent).find({
      where: { donorId: { $in: donors.map(d => d.id) }, isActive: true }
    })
    const eventsByDonor = new Map<string, DonorEvent[]>()
    for (const e of allEvents) {
      if (!e.donorId) continue
      if (!eventsByDonor.has(e.donorId)) eventsByDonor.set(e.donorId, [])
      eventsByDonor.get(e.donorId)!.push(e)
    }

    // Load reception hours for all donors
    const allReceptionHours = await remult.repo(DonorReceptionHour).find({
      where: { donorId: { $in: donors.map(d => d.id) }, isActive: true }
    })
    const receptionByDonor = new Map<string, DonorReceptionHour[]>()
    for (const rh of allReceptionHours) {
      if (!rh.donorId) continue
      if (!receptionByDonor.has(rh.donorId)) receptionByDonor.set(rh.donorId, [])
      receptionByDonor.get(rh.donorId)!.push(rh)
    }

    // Load notes for all donors
    const allNotes = await remult.repo(DonorNote).find({
      where: { donorId: { $in: donors.map(d => d.id) }, isActive: true }
    })
    const notesByDonor = new Map<string, DonorNote[]>()
    for (const n of allNotes) {
      if (!n.donorId) continue
      if (!notesByDonor.has(n.donorId)) notesByDonor.set(n.donorId, [])
      notesByDonor.get(n.donorId)!.push(n)
    }

    // Load relations for all donors (both directions)
    const allRelations = await remult.repo(DonorRelation).find({
      where: { $or: [
        { donor1Id: { $in: donors.map(d => d.id) } },
        { donor2Id: { $in: donors.map(d => d.id) } }
      ] }
    })
    const relationsByDonor = new Map<string, Array<{ name: string; type: string }>>()
    for (const rel of allRelations) {
      // For donor1: the related person is donor2
      if (rel.donor1Id && donorMap.has(rel.donor1Id)) {
        const relatedDonor = donorMap.get(rel.donor2Id)
        if (relatedDonor) {
          if (!relationsByDonor.has(rel.donor1Id)) relationsByDonor.set(rel.donor1Id, [])
          relationsByDonor.get(rel.donor1Id)!.push({
            name: `${relatedDonor.firstName || ''} ${relatedDonor.lastName || ''}`.trim(),
            type: rel.relationshipType1 || ''
          })
        }
      }
    }

    // Load companies (direct link via donor.companyIds)
    const allCompanyIds = new Set<string>()
    for (const d of donors) {
      if (d.companyIds?.length) d.companyIds.forEach(id => allCompanyIds.add(id))
    }
    const companiesMap = new Map<string, Company>()
    if (allCompanyIds.size) {
      const companies = await remult.repo(Company).find({
        where: { id: { $in: [...allCompanyIds] }, isActive: true }
      })
      for (const c of companies) companiesMap.set(c.id, c)
    }

    // Load organizations (via Donation → DonationOrganization)
    const donorIds = donors.map(d => d.id)
    const donorDonations = await remult.repo(Donation).find({
      where: { donorId: { $in: donorIds } }
    })
    const donationIds = donorDonations.map(d => d.id)
    const donationByDonorId = new Map<string, string[]>()
    for (const d of donorDonations) {
      if (!donationByDonorId.has(d.donorId)) donationByDonorId.set(d.donorId, [])
      donationByDonorId.get(d.donorId)!.push(d.id)
    }
    const orgsByDonor = new Map<string, Set<string>>()
    if (donationIds.length) {
      const donationOrgs = await remult.repo(DonationOrganization).find({
        where: { donationId: { $in: donationIds }, isActive: true }
      })
      for (const dorg of donationOrgs) {
        // Find which donor owns this donation
        for (const [donorId, dIds] of donationByDonorId) {
          if (dIds.includes(dorg.donationId)) {
            if (!orgsByDonor.has(donorId)) orgsByDonor.set(donorId, new Set())
            orgsByDonor.get(donorId)!.add(dorg.organizationId)
          }
        }
      }
    }
    const allOrgIds = new Set<string>()
    for (const ids of orgsByDonor.values()) ids.forEach(id => allOrgIds.add(id))
    const orgsMap = new Map<string, Organization>()
    if (allOrgIds.size) {
      const orgs = await remult.repo(Organization).find({
        where: { id: { $in: [...allOrgIds] }, isActive: true }
      })
      for (const o of orgs) orgsMap.set(o.id, o)
    }

    // Merge companies + organizations per donor
    const orgNamesByDonor = new Map<string, string[]>()
    for (const d of donors) {
      const names = new Set<string>()
      // Companies
      if (d.companyIds?.length) {
        for (const id of d.companyIds) {
          const c = companiesMap.get(id)
          if (c) names.add(c.name)
        }
      }
      // Organizations
      const orgIds = orgsByDonor.get(d.id)
      if (orgIds) {
        for (const id of orgIds) {
          const o = orgsMap.get(id)
          if (o) names.add(o.name)
        }
      }
      if (names.size) orgNamesByDonor.set(d.id, [...names])
    }

    // Fetch Google contacts from the group
    const googleContacts = await fetchAllGroupContacts(peopleService, groupResourceName)
    const googleByRN = new Map<string, people_v1.Schema$Person>()
    for (const gc of googleContacts) {
      if (gc.resourceName) googleByRN.set(gc.resourceName, gc)
    }

    // 2. CATEGORIZE changes for existing mappings
    type SyncItem = { donor: Donor, contacts: DonorContact[], place?: DonorPlace, events?: DonorEvent[], receptionHours?: DonorReceptionHour[], relations?: Array<{ name: string; type: string }>, orgNames?: string[], notes?: DonorNote[], mapping: GoogleContactMapping }
    const toCreate: SyncItem[] = []
    const toUpdate: SyncItem[] = []

    const buildItem = (donor: Donor, mapping: GoogleContactMapping): SyncItem => ({
      donor, mapping,
      contacts: contactsByDonor.get(donor.id) || [],
      place: primaryPlaces.get(donor.id),
      events: eventsByDonor.get(donor.id),
      receptionHours: receptionByDonor.get(donor.id),
      relations: relationsByDonor.get(donor.id),
      orgNames: orgNamesByDonor.get(donor.id),
      notes: notesByDonor.get(donor.id)
    })

    for (const mapping of mappings) {
      try {
        const donor = donorMap.get(mapping.donorId)
        const googlePerson = googleByRN.get(mapping.googleResourceName)

        if (!donor) {
          mapping.syncStatus = 'error'
          await remult.repo(GoogleContactMapping).save(mapping)
          continue
        }

        if (!googlePerson) {
          // Re-create in Google (was deleted externally)
          mapping.googleResourceName = ''
          mapping.googleEtag = ''
          toCreate.push(buildItem(donor, mapping))
          continue
        }

        // Compute hashes
        const currentPlatformHash = computePlatformHash(donor, contactsByDonor.get(donor.id) || [], primaryPlaces.get(donor.id)?.place, eventsByDonor.get(donor.id), receptionByDonor.get(donor.id), relationsByDonor.get(donor.id), orgNamesByDonor.get(donor.id), notesByDonor.get(donor.id))
        const currentGoogleHash = computeGoogleHash(googlePerson)
        const platformChanged = currentPlatformHash !== mapping.platformHash
        const googleChanged = currentGoogleHash !== mapping.googleHash

        if (!platformChanged && !googleChanged) {
          googleByRN.delete(mapping.googleResourceName)
          continue
        }

        if (platformChanged && !googleChanged) {
          toUpdate.push(buildItem(donor, mapping))
        } else if (!platformChanged && googleChanged) {
          // PULL: Google → platform (no API call needed, do immediately)
          await pullGoogleToPlatform(donor, googlePerson, mapping, contactsByDonor.get(donor.id) || [], result)
        } else {
          // CONFLICT
          await handleConflict(
            peopleService, donor, googlePerson, mapping,
            contactsByDonor.get(donor.id) || [], primaryPlaces.get(donor.id),
            eventsByDonor.get(donor.id), receptionByDonor.get(donor.id),
            groupResourceName, options, result, toCreate, toUpdate,
            relationsByDonor.get(donor.id), orgNamesByDonor.get(donor.id),
            notesByDonor.get(donor.id)
          )
        }

        googleByRN.delete(mapping.googleResourceName)
      } catch (err: any) {
        result.errors++
        result.errorDetails.push(`Mapping ${mapping.donorId}: ${err.message}`)
      }
    }

    // Donors without mapping → need to create in Google
    for (const donor of donors) {
      if (mappingByDonorId.has(donor.id)) continue
      const mapping = remult.repo(GoogleContactMapping).create()
      mapping.userId = userId
      mapping.donorId = donor.id
      toCreate.push(buildItem(donor, mapping))
    }

    // 3. BATCH CREATE
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      if (isSyncCancelled(logId)) {
        result.errorDetails.push('בוטל ע"י המשתמש')
        clearCancelledSync(logId)
        throw new Error('Sync cancelled')
      }
      const batch = toCreate.slice(i, i + BATCH_SIZE)
      try {
        await batchCreateContacts(peopleService, batch, groupResourceName, result)
        await updateLog(logId, result)
      } catch (err: any) {
        result.errors += batch.length
        result.errorDetails.push(`Batch create error: ${err.message}`)
      }
    }

    // 4. BATCH UPDATE
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      if (isSyncCancelled(logId)) {
        result.errorDetails.push('בוטל ע"י המשתמש')
        clearCancelledSync(logId)
        throw new Error('Sync cancelled')
      }
      const batch = toUpdate.slice(i, i + BATCH_SIZE)
      try {
        await batchUpdateContacts(peopleService, batch, groupResourceName, result)
        await updateLog(logId, result)
      } catch (err: any) {
        result.errors += batch.length
        result.errorDetails.push(`Batch update error: ${err.message}`)
      }
    }

    // 5. PULL new Google contacts to platform
    for (const [rn, person] of googleByRN) {
      if (mappingByGoogleRN.has(rn)) continue
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
  } catch (err: any) {
    result.errors++
    result.errorDetails.push(`Sync failed: ${err.message}`)
  }

  // Finalize log
  result.duration = Date.now() - startTime
  try {
    const log = await remult.repo(GoogleSyncLog).findId(logId)
    if (log) {
      log.status = result.success ? 'completed' : 'failed'
      log.donorsPushed = result.donorsPushed
      log.contactsPulled = result.contactsPulled
      log.conflicts = result.conflicts
      log.errors = result.errors
      log.errorDetails = result.errorDetails
      log.duration = result.duration
      await remult.repo(GoogleSyncLog).save(log)
    }
  } catch (err: any) {
    console.error('[GoogleContacts] Failed to update sync log:', err)
  }

  console.log(`[GoogleContacts] Sync completed: ${result.donorsPushed} pushed, ${result.contactsPulled} pulled, ${result.errors} errors in ${(result.duration / 1000).toFixed(1)}s`)
  return result
}

// ============ Batch Create ============
async function batchCreateContacts(
  peopleService: people_v1.People,
  items: Array<{ donor: Donor, contacts: DonorContact[], place?: DonorPlace, events?: DonorEvent[], receptionHours?: DonorReceptionHour[], relations?: Array<{ name: string; type: string }>, orgNames?: string[], notes?: DonorNote[], mapping: GoogleContactMapping }>,
  groupResourceName: string,
  result: SyncResult
) {
  const contactsToCreate = items.map(item => ({
    contactPerson: donorToGooglePerson(item.donor, item.contacts, item.place, groupResourceName, item.events, item.receptionHours, item.relations, item.orgNames, item.notes)
  }))

  const response = await peopleService.people.batchCreateContacts({
    requestBody: {
      contacts: contactsToCreate,
      readMask: PERSON_FIELDS
    }
  })

  const createdPeople = response.data.createdPeople || []
  for (let i = 0; i < createdPeople.length; i++) {
    const person = createdPeople[i]?.person
    if (!person || !person.resourceName || i >= items.length) continue

    const item = items[i]
    item.mapping.googleResourceName = person.resourceName
    item.mapping.googleEtag = person.etag || ''
    item.mapping.platformHash = computePlatformHash(item.donor, item.contacts, item.place?.place, item.events, item.receptionHours, item.relations, item.orgNames, item.notes)
    item.mapping.googleHash = computeGoogleHash(person)
    item.mapping.syncStatus = 'synced'
    item.mapping.lastSyncedAt = new Date()
    await remult.repo(GoogleContactMapping).save(item.mapping)
    result.donorsPushed++
  }
}

// ============ Batch Update ============
async function batchUpdateContacts(
  peopleService: people_v1.People,
  items: Array<{ donor: Donor, contacts: DonorContact[], place?: DonorPlace, events?: DonorEvent[], receptionHours?: DonorReceptionHour[], relations?: Array<{ name: string; type: string }>, orgNames?: string[], notes?: DonorNote[], mapping: GoogleContactMapping }>,
  groupResourceName: string,
  result: SyncResult
) {
  const contacts: { [resourceName: string]: people_v1.Schema$Person } = {}
  const itemByRN = new Map<string, typeof items[0]>()

  // Fetch fresh etags from Google before updating
  const resourceNames = items.map(i => i.mapping.googleResourceName).filter(Boolean)
  const freshEtags = new Map<string, string>()
  if (resourceNames.length) {
    for (let i = 0; i < resourceNames.length; i += 200) {
      const batch = resourceNames.slice(i, i + 200)
      const res = await peopleService.people.getBatchGet({
        resourceNames: batch,
        personFields: 'metadata'
      })
      if (res.data.responses) {
        for (const r of res.data.responses) {
          if (r.person?.resourceName && r.person?.etag) {
            freshEtags.set(r.person.resourceName, r.person.etag)
          }
        }
      }
    }
  }

  for (const item of items) {
    if (!item.mapping.googleResourceName) continue
    const personData = donorToGooglePerson(item.donor, item.contacts, item.place, groupResourceName, item.events, item.receptionHours, item.relations, item.orgNames, item.notes)
    personData.etag = freshEtags.get(item.mapping.googleResourceName) || item.mapping.googleEtag || undefined
    contacts[item.mapping.googleResourceName] = personData
    itemByRN.set(item.mapping.googleResourceName, item)
  }

  const response = await peopleService.people.batchUpdateContacts({
    requestBody: {
      contacts,
      updateMask: 'names,emailAddresses,phoneNumbers,addresses,birthdays,events,userDefined,relations,organizations,biographies',
      readMask: PERSON_FIELDS
    }
  })

  const updateResult = response.data.updateResult || {}
  for (const [rn, personResponse] of Object.entries(updateResult)) {
    const person = (personResponse as any)?.person as people_v1.Schema$Person | undefined
    const item = itemByRN.get(rn)
    if (!person || !item) continue

    item.mapping.googleEtag = person.etag || ''
    item.mapping.platformHash = computePlatformHash(item.donor, item.contacts, item.place?.place, item.events, item.receptionHours, item.relations, item.orgNames, item.notes)
    item.mapping.googleHash = computeGoogleHash(person)
    item.mapping.syncStatus = 'synced'
    item.mapping.lastSyncedAt = new Date()
    await remult.repo(GoogleContactMapping).save(item.mapping)
    result.donorsPushed++
  }
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

  donor.firstName = fields.firstName || donor.firstName
  donor.lastName = fields.lastName || donor.lastName

  // Sync companies from Google → platform
  const pulledOrgNames = await syncOrganizationsFromGoogle(donor, fields.orgNames)

  await remult.repo(Donor).save(donor)

  await syncContacts(donor.id!, fields.phones, existingContacts.filter(c => c.type === 'phone'), 'phone')
  await syncContacts(donor.id!, fields.emails, existingContacts.filter(c => c.type === 'email'), 'email')

  // Sync address from Google → platform
  await syncAddressFromGoogle(donor.id!, fields.addresses)

  // Sync events from Google → platform
  await syncEventsFromGoogle(donor.id!, fields.events)

  // Sync relations from Google → platform
  const pulledRelations = await syncRelationsFromGoogle(donor, fields.relations)

  // Sync notes (DonorNote entities) from Google → platform
  const pulledNotes = await syncNotesFromGoogle(donor.id!, fields.notes)

  const updatedContacts = await remult.repo(DonorContact).find({ where: { donorId: donor.id, isActive: true } })
  mapping.platformHash = computePlatformHash(donor, updatedContacts, undefined, undefined, undefined, pulledRelations, pulledOrgNames, pulledNotes)
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
  if (!fields.lastName) return

  const donor = remult.repo(Donor).create()
  donor.firstName = fields.firstName
  donor.lastName = fields.lastName

  // Sync companies from Google → platform (before save to set companyIds)
  const pulledOrgNames = await syncOrganizationsFromGoogle(donor, fields.orgNames)

  const saved = await remult.repo(Donor).save(donor)

  for (const phone of fields.phones) {
    if (!phone.phoneNumber) continue
    const dc = remult.repo(DonorContact).create()
    dc.donorId = saved.id
    dc.type = 'phone'
    dc.phoneNumber = phone.phoneNumber
    dc.isPrimary = phone.isPrimary
    if (phone.description) dc.description = phone.description
    await remult.repo(DonorContact).save(dc)
  }
  for (const email of fields.emails) {
    if (!email.email) continue
    const dc = remult.repo(DonorContact).create()
    dc.donorId = saved.id
    dc.type = 'email'
    dc.email = email.email
    dc.isPrimary = email.isPrimary
    if (email.description) dc.description = email.description
    await remult.repo(DonorContact).save(dc)
  }

  // Sync address from Google → platform
  await syncAddressFromGoogle(saved.id!, fields.addresses)

  // Sync events from Google → platform
  await syncEventsFromGoogle(saved.id!, fields.events)

  // Sync relations from Google → platform
  const pulledRelations = await syncRelationsFromGoogle(saved, fields.relations)

  // Sync notes (DonorNote entities) from Google → platform
  const pulledNotes = await syncNotesFromGoogle(saved.id!, fields.notes)

  const mapping = remult.repo(GoogleContactMapping).create()
  mapping.userId = userId
  mapping.donorId = saved.id
  mapping.googleResourceName = googleResourceName
  mapping.googleEtag = person.etag || ''
  const allContacts = await remult.repo(DonorContact).find({
    where: { donorId: saved.id, isActive: true }
  })
  mapping.platformHash = computePlatformHash(saved, allContacts, undefined, undefined, undefined, pulledRelations, pulledOrgNames, pulledNotes)
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
  events: DonorEvent[] | undefined,
  receptionHours: DonorReceptionHour[] | undefined,
  groupResourceName: string,
  options: SyncOptions,
  result: SyncResult,
  toCreate: Array<any>,
  toUpdate: Array<any>,
  relations?: Array<{ name: string; type: string }>,
  orgNames?: string[],
  notes?: DonorNote[]
) {
  const resolution = options.conflictResolution || 'platform_wins'

  if (resolution === 'manual') {
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
    toUpdate.push({ donor, contacts, place: primaryDonorPlace, events, receptionHours, relations, orgNames, notes, mapping })
  } else if (resolution === 'google_wins') {
    await pullGoogleToPlatform(donor, person, mapping, contacts, result)
  } else if (resolution === 'newest_wins') {
    const metadataArr = person.metadata as any[]
    const googleModified = metadataArr?.[0]?.source?.updateTime
    const platformModified = donor.updatedDate?.getTime() || 0
    const googleTime = googleModified ? new Date(googleModified).getTime() : 0

    if (platformModified >= googleTime) {
      toUpdate.push({ donor, contacts, place: primaryDonorPlace, events, receptionHours, relations, orgNames, notes, mapping })
    } else {
      await pullGoogleToPlatform(donor, person, mapping, contacts, result)
    }
  }
}

// ============ Sync Organizations from Google → Platform ============
async function syncOrganizationsFromGoogle(
  donor: Donor,
  googleOrgNames: string[]
): Promise<string[]> {
  if (!googleOrgNames?.length) return donor.companyIds?.length ? await getOrgNamesForDonor(donor) : []

  if (!donor.companyIds) donor.companyIds = []
  const existingCompanies = donor.companyIds.length
    ? await remult.repo(Company).find({ where: { id: { $in: donor.companyIds } } })
    : []
  const existingNames = new Set(existingCompanies.map(c => c.name))

  for (const orgName of googleOrgNames) {
    if (!orgName || existingNames.has(orgName)) continue

    // Try to find existing company by name
    let company = await remult.repo(Company).findFirst({ name: orgName, isActive: true })
    if (!company) {
      // Create new company
      company = remult.repo(Company).create()
      company.name = orgName
      company.isActive = true
      company = await remult.repo(Company).save(company)
    }

    if (!donor.companyIds.includes(company.id)) {
      donor.companyIds.push(company.id)
    }
    existingNames.add(orgName)
  }

  return [...existingNames]
}

async function getOrgNamesForDonor(donor: Donor): Promise<string[]> {
  if (!donor.companyIds?.length) return []
  const companies = await remult.repo(Company).find({ where: { id: { $in: donor.companyIds }, isActive: true } })
  return companies.map(c => c.name)
}

// ============ Sync Relations from Google → Platform ============
const GOOGLE_TO_HEBREW_RELATION: { [key: string]: string } = {
  'spouse': 'בעל/אישה',
  'child': 'בן/בת',
  'parent': 'אב/אם',
  'brother': 'אח',
  'sister': 'אחות',
  'relative': 'קרוב משפחה',
  'friend': 'חבר',
}

async function syncRelationsFromGoogle(
  donor: Donor,
  googleRelations: Array<{ name: string; type: string }>
): Promise<Array<{ name: string; type: string }>> {
  if (!googleRelations?.length) {
    // Return existing relations for hash
    const existing = await remult.repo(DonorRelation).find({
      where: { $or: [{ donor1Id: donor.id }, { donor2Id: donor.id }] },
      include: { donor1: true, donor2: true }
    })
    return existing.map(r => {
      const relatedDonor = r.donor1Id === donor.id ? r.donor2 : r.donor1
      return { name: `${relatedDonor?.firstName || ''} ${relatedDonor?.lastName || ''}`.trim(), type: r.relationshipType1 }
    })
  }

  // Load existing relations
  const existingRelations = await remult.repo(DonorRelation).find({
    where: { $or: [{ donor1Id: donor.id }, { donor2Id: donor.id }] },
    include: { donor1: true, donor2: true }
  })
  const existingNames = new Set(existingRelations.map(r => {
    const rd = r.donor1Id === donor.id ? r.donor2 : r.donor1
    return `${rd?.firstName || ''} ${rd?.lastName || ''}`.trim()
  }))

  const resultRelations: Array<{ name: string; type: string }> = existingRelations.map(r => {
    const rd = r.donor1Id === donor.id ? r.donor2 : r.donor1
    return { name: `${rd?.firstName || ''} ${rd?.lastName || ''}`.trim(), type: r.relationshipType1 }
  })

  for (const rel of googleRelations) {
    if (!rel.name || existingNames.has(rel.name)) continue

    // Try to find donor by name
    const nameParts = rel.name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const matchingDonor = await remult.repo(Donor).findFirst({
      firstName, lastName, isActive: true
    })

    if (matchingDonor) {
      const hebrewType = GOOGLE_TO_HEBREW_RELATION[rel.type] || rel.type || 'קרוב משפחה'
      const dr = remult.repo(DonorRelation).create()
      dr.donor1Id = donor.id!
      dr.donor2Id = matchingDonor.id
      dr.relationshipType1 = hebrewType
      await remult.repo(DonorRelation).save(dr)
      resultRelations.push({ name: rel.name, type: hebrewType })
    }
    // If no matching donor found, skip (can't create relation without a donor)
  }

  return resultRelations
}

// ============ Sync Notes from Google → Platform (DonorNote entities) ============
async function syncNotesFromGoogle(
  donorId: string,
  googleNotes: Array<{ noteType: string; content: string }>
): Promise<DonorNote[]> {
  // Load existing notes for this donor
  const existingNotes = await remult.repo(DonorNote).find({
    where: { donorId, isActive: true }
  })

  if (!googleNotes?.length) return existingNotes

  // Build a set of existing notes by key (noteType + content)
  const existingKeys = new Set(existingNotes.map(n => `${n.noteType || ''}|${n.content || ''}`))

  for (const gNote of googleNotes) {
    const key = `${gNote.noteType || ''}|${gNote.content || ''}`
    if (!gNote.content || existingKeys.has(key)) continue

    const dn = remult.repo(DonorNote).create()
    dn.donorId = donorId
    dn.noteType = gNote.noteType || ''
    dn.content = gNote.content
    dn.isActive = true
    await remult.repo(DonorNote).save(dn)
    existingNotes.push(dn)
    existingKeys.add(key)
  }

  return existingNotes
}

// ============ Sync Address from Google → Platform ============
async function syncAddressFromGoogle(
  donorId: string,
  addresses: Array<{ street: string; city: string; state: string; postcode: string; country: string; extendedAddress: string; type: string }>
): Promise<void> {
  if (!addresses?.length) return

  const { geocodeAddress } = await import('./geo')

  // Load existing places for this donor
  const existingDonorPlaces = await remult.repo(DonorPlace).find({
    where: { donorId, isActive: true },
    include: { place: true }
  })
  const existingCities = new Set(existingDonorPlaces.map(dp => dp.place?.city || '').filter(Boolean))

  let isFirst = existingDonorPlaces.length === 0

  for (const address of addresses) {
    if (!address.street && !address.city) continue

    // Skip if we already have a place in this city (simple duplicate check)
    if (address.city && existingCities.has(address.city)) continue

    const fullAddr = [address.street, address.city, address.state, address.postcode, address.country].filter(Boolean).join(', ')

    // Use Google Geocoding to get real placeId + coordinates
    const geoResult = await geocodeAddress(fullAddr)

    const place = remult.repo(Place).create()
    place.placeId = geoResult?.placeId || `gc-${Date.now()}`
    place.fullAddress = fullAddr
    place.street = geoResult?.streetname || address.street
    place.houseNumber = (geoResult?.homenumber || '') + ''
    place.city = geoResult?.cityname || address.city
    place.state = geoResult?.state || address.state
    place.postcode = geoResult?.postcode || address.postcode
    place.neighborhood = geoResult?.neighborhood || ''
    place.latitude = geoResult?.y || 0
    place.longitude = geoResult?.x || 0

    if (address.extendedAddress) {
      const parts = address.extendedAddress.split(',').map(s => s.trim())
      if (parts[0] && !place.apartment) place.apartment = parts[0]
      if (parts[1] && !place.neighborhood) place.neighborhood = parts[1]
    }

    // Match country
    if (geoResult?.countryCode) {
      const country = await remult.repo(Country).findFirst({ code: geoResult.countryCode })
      if (country) place.countryId = country.id
    } else if (address.country) {
      const country = await remult.repo(Country).findFirst({
        $or: [{ name: address.country }, { nameEn: address.country }]
      })
      if (country) place.countryId = country.id
    }

    const savedPlace = await remult.repo(Place).save(place)

    // Create DonorPlace
    const donorPlace = remult.repo(DonorPlace).create()
    donorPlace.donorId = donorId
    donorPlace.placeId = savedPlace.id
    donorPlace.isPrimary = isFirst
    await remult.repo(DonorPlace).save(donorPlace)

    existingCities.add(address.city)
    isFirst = false
  }
}

// ============ Sync Events from Google → Platform ============
async function syncEventsFromGoogle(
  donorId: string,
  googleEvents: Array<{ description: string; date: { year?: number | null; month?: number | null; day?: number | null } }>
): Promise<void> {
  if (!googleEvents?.length) return

  const existingDonorEvents = await remult.repo(DonorEvent).find({
    where: { donorId, isActive: true },
    include: { event: true }
  })
  const existingDescriptions = new Set(existingDonorEvents.map(de => de.event?.description || ''))

  for (const ge of googleEvents) {
    if (!ge.description || !ge.date?.year || !ge.date?.month || !ge.date?.day) continue
    if (existingDescriptions.has(ge.description)) continue

    // Find or create Event by description
    let event = await remult.repo(Event).findFirst({ description: ge.description, isActive: true })
    if (!event) {
      event = remult.repo(Event).create()
      event.description = ge.description
      event.type = 'personal'
      event = await remult.repo(Event).save(event)
    }

    // Create DonorEvent
    const de = remult.repo(DonorEvent).create()
    de.donorId = donorId
    de.eventId = event.id
    de.date = new Date(ge.date.year, ge.date.month - 1, ge.date.day)
    await remult.repo(DonorEvent).save(de)
  }
}

// ============ Contact Sync Helper ============
async function syncContacts(
  donorId: string,
  incoming: Array<{ phoneNumber?: string; email?: string; isPrimary: boolean; description?: string; type: 'phone' | 'email' }>,
  existing: DonorContact[],
  contactType: 'phone' | 'email'
) {
  const existingValues = new Set(existing.map(c => contactType === 'phone' ? c.phoneNumber : c.email))

  for (const item of incoming) {
    const value = contactType === 'phone' ? item.phoneNumber : item.email
    if (!value || existingValues.has(value)) continue

    const dc = remult.repo(DonorContact).create()
    dc.donorId = donorId
    dc.type = contactType
    if (contactType === 'phone') dc.phoneNumber = value
    else dc.email = value
    dc.isPrimary = item.isPrimary
    if (item.description) dc.description = item.description
    await remult.repo(DonorContact).save(dc)
  }
}
