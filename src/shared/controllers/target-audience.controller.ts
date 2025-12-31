import { BackendMethod, remult } from 'remult'
import { TargetAudience } from '../entity/target-audience'
import { Donor } from '../entity/donor'
import { DonorPlace } from '../entity/donor-place'

export class TargetAudienceController {

  @BackendMethod({ allowed: true })
  static async createTargetAudience(
    name: string,
    description: string,
    donorIds: string[],
    polygonPoints?: { lat: number; lng: number }[],
    metadata?: any
  ): Promise<TargetAudience> {
    const targetAudienceRepo = remult.repo(TargetAudience)

    // Create new target audience
    const targetAudience = await targetAudienceRepo.insert({
      name,
      description,
      donorIds,
      polygonPoints,
      metadata,
      createdByUserId: remult.user?.id,
      createdDate: new Date(),
      updatedDate: new Date(),
      isActive: true
    })

    return targetAudience
  }

  @BackendMethod({ allowed: true })
  static async updateTargetAudience(
    id: string,
    updates: Partial<TargetAudience>
  ): Promise<TargetAudience> {
    const targetAudienceRepo = remult.repo(TargetAudience)

    const targetAudience = await targetAudienceRepo.findId(id)
    if (!targetAudience) {
      throw new Error('קהל יעד לא נמצא')
    }

    // Update fields
    Object.assign(targetAudience, updates)
    targetAudience.updatedDate = new Date()

    await targetAudienceRepo.save(targetAudience)
    return targetAudience
  }

  @BackendMethod({ allowed: true })
  static async deleteTargetAudience(id: string): Promise<void> {
    const targetAudienceRepo = remult.repo(TargetAudience)
    await targetAudienceRepo.delete(id)
  }

  @BackendMethod({ allowed: true })
  static async getTargetAudiences(): Promise<TargetAudience[]> {
    const targetAudienceRepo = remult.repo(TargetAudience)

    return await targetAudienceRepo.find({
      where: { isActive: true },
      orderBy: { createdDate: 'desc' }
    })
  }

  @BackendMethod({ allowed: true })
  static async getTargetAudienceWithDonors(id: string): Promise<{
    targetAudience: TargetAudience,
    donors: Donor[]
  }> {
    const targetAudienceRepo = remult.repo(TargetAudience)
    const donorRepo = remult.repo(Donor)

    const targetAudience = await targetAudienceRepo.findId(id)
    if (!targetAudience) {
      throw new Error('קהל יעד לא נמצא')
    }

    // Get all donors in this target audience
    const donors = await donorRepo.find({
      where: {
        id: targetAudience.donorIds
      }
    })

    return {
      targetAudience,
      donors
    }
  }

  @BackendMethod({ allowed: true })
  static async addDonorsToTargetAudience(
    targetAudienceId: string,
    donorIdsToAdd: string[]
  ): Promise<TargetAudience> {
    const targetAudienceRepo = remult.repo(TargetAudience)

    const targetAudience = await targetAudienceRepo.findId(targetAudienceId)
    if (!targetAudience) {
      throw new Error('קהל יעד לא נמצא')
    }

    // Add new donor IDs (avoid duplicates)
    const existingIds = new Set(targetAudience.donorIds)
    donorIdsToAdd.forEach(id => existingIds.add(id))

    targetAudience.donorIds = Array.from(existingIds)
    targetAudience.updatedDate = new Date()

    await targetAudienceRepo.save(targetAudience)
    return targetAudience
  }

  @BackendMethod({ allowed: true })
  static async removeDonorsFromTargetAudience(
    targetAudienceId: string,
    donorIdsToRemove: string[]
  ): Promise<TargetAudience> {
    const targetAudienceRepo = remult.repo(TargetAudience)

    const targetAudience = await targetAudienceRepo.findId(targetAudienceId)
    if (!targetAudience) {
      throw new Error('קהל יעד לא נמצא')
    }

    // Remove donor IDs
    const idsToRemoveSet = new Set(donorIdsToRemove)
    targetAudience.donorIds = targetAudience.donorIds.filter(id => !idsToRemoveSet.has(id))
    targetAudience.updatedDate = new Date()

    await targetAudienceRepo.save(targetAudience)
    return targetAudience
  }

  @BackendMethod({ allowed: true })
  static async refreshTargetAudienceByPolygon(
    targetAudienceId: string
  ): Promise<TargetAudience> {
    const targetAudienceRepo = remult.repo(TargetAudience)
    const donorRepo = remult.repo(Donor)

    const targetAudience = await targetAudienceRepo.findId(targetAudienceId)
    if (!targetAudience) {
      throw new Error('קהל יעד לא נמצא')
    }

    if (!targetAudience.polygonPoints || targetAudience.polygonPoints.length < 3) {
      throw new Error('קהל היעד לא מכיל נתוני פוליגון')
    }

    // Get all active donors
    const allDonors = await donorRepo.find({
      where: { isActive: true }
    })

    // Get primary donor places with location (בית first, then any other)
    const allDonorPlaces = await remult.repo(DonorPlace).find({
      where: { isActive: true },
      include: { place: true, addressType: true }
    })
    const primaryPlacesMap = DonorPlace.getPrimaryPlacesMap(allDonorPlaces)

    // Find donors inside polygon
    const donorsInPolygon: string[] = []

    for (const donor of allDonors) {
      // Find primary donor place
      const donorPlace = primaryPlacesMap.get(donor.id)

      if (donorPlace && donorPlace.place && donorPlace.place.latitude && donorPlace.place.longitude) {
        const point = {
          lat: donorPlace.place.latitude,
          lng: donorPlace.place.longitude
        }

        // Check if point is inside polygon using ray casting algorithm
        if (this.isPointInPolygon(point, targetAudience.polygonPoints)) {
          donorsInPolygon.push(donor.id)
        }
      }
    }

    // Update donor IDs
    targetAudience.donorIds = donorsInPolygon
    targetAudience.updatedDate = new Date()

    await targetAudienceRepo.save(targetAudience)
    return targetAudience
  }

  // Helper function - Ray casting algorithm to check if point is inside polygon
  private static isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[]
  ): boolean {
    let inside = false
    const x = point.lng
    const y = point.lat

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng
      const yi = polygon[i].lat
      const xj = polygon[j].lng
      const yj = polygon[j].lat

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }

    return inside
  }
}
