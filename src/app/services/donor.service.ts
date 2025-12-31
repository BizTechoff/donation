import { Injectable } from '@angular/core';
import { remult } from 'remult';
import { DonorMapController, DonorMapData } from '../../shared/controllers/donor-map.controller';
import { DonorController } from '../../shared/controllers/donor.controller';
import { Donation, Donor, DonorContact, DonorEvent, DonorPlace, Event, Place } from '../../shared/entity';
import { GlobalFilters, GlobalFilterService } from './global-filter.service';

@Injectable({
  providedIn: 'root'
})
export class DonorService {
  private donorPlaceRepo = remult.repo(DonorPlace);
  private donorContactRepo = remult.repo(DonorContact);
  private donorEventRepo = remult.repo(DonorEvent);
  private eventRepo = remult.repo(Event);
  private donationRepo = remult.repo(Donation);

  constructor(private globalFilterService: GlobalFilterService) { }

  async findAll(): Promise<Donor[]> {
    return await DonorController.findAll();
  }

  async findActive(): Promise<Donor[]> {
    return await DonorController.findActive();
  }

  /**
   * Get only donor IDs with filters - much faster for maps
   * Global filters are fetched from user.settings in the backend
   */
  async findFilteredIds(additionalFilters?: Partial<GlobalFilters>): Promise<string[]> {
    console.log('DonorService.findFilteredIds - additionalFilters:', JSON.stringify(additionalFilters, null, 2));
    return await DonorController.findFilteredIds(additionalFilters);
  }

  /**
   * Find donors with global filters applied automatically in the backend
   */
  async findFiltered(
    searchTerm?: string,
    additionalFilters?: Partial<GlobalFilters>,
    page?: number,
    pageSize?: number,
    sortColumns?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): Promise<Donor[]> {
    return await DonorController.findFilteredDonors(searchTerm, additionalFilters, page, pageSize, sortColumns);
  }

  async findById(id: string): Promise<Donor | null> {
    return await DonorController.findById(id);
  }

  async count(): Promise<number> {
    return await DonorController.count();
  }

  async countActive(): Promise<number> {
    return await DonorController.countActive();
  }

  /**
   * Count donors with global filters applied automatically in the backend
   */
  async countFiltered(searchTerm?: string, additionalFilters?: Partial<GlobalFilters>): Promise<number> {
    return await DonorController.countFilteredDonors(searchTerm, additionalFilters);
  }

  /**
   * Load donors map data with full stats
   * Uses global filters from user.settings and merges with additional filters from client
   * @param additionalFilters Additional filters from client (searchTerm, minTotalDonations, etc)
   */
  async loadDonorsMapData(additionalFilters?: Partial<GlobalFilters>): Promise<DonorMapData[]> {
    // @ts-ignore - remult metadata not updated yet
    return await DonorMapController.loadDonorsMapData(additionalFilters);
  }

  /**
   * Load donors map data for specific donor IDs
   */
  async loadDonorsMapDataByIds(donorIds: string[]): Promise<DonorMapData[]> {
    return await DonorMapController.loadDonorsMapDataByIds(donorIds);
  }

  /**
   * Load all related data for a list of donors
   * Returns maps for efficient lookup
   */
  async loadDonorRelatedData(donorIds: string[]) {
    if (!donorIds || donorIds.length === 0) {
      return this.createEmptyMaps();
    }

    // Load all places at once
    const allPlaces = await this.donorPlaceRepo.find({
      where: {
        donorId: { $in: donorIds },
        isPrimary: true,
        isActive: true
      },
      include: { place: { include: { country: true } } }
    });

    // Load all contacts at once
    const allContacts = await this.donorContactRepo.find({
      where: {
        donorId: { $in: donorIds },
        isPrimary: true,
        isActive: true
      }
    });

    // Load birth date event type
    const birthEvent = await this.eventRepo.findFirst({
      description: 'יום הולדת',
      isActive: true
    });

    let allBirthEvents: DonorEvent[] = [];
    if (birthEvent) {
      allBirthEvents = await this.donorEventRepo.find({
        where: {
          donorId: { $in: donorIds },
          eventId: birthEvent.id,
          isActive: true
        }
      });
    }

    // Load all donations at once
    const allDonations = await this.donationRepo.find({
      where: {
        donorId: { $in: donorIds }
      },
      include: { donor: true }
    });

    // Build maps
    return this.buildMaps(allPlaces, allContacts, allBirthEvents, allDonations);
  }

  /**
   * Get home place for a donor
   * Looks for DonorPlace with home-related addressType
   */
  async getHomePlaceForDonor(donorId: string): Promise<Place | undefined> {
    const homeAddressTypes = ['בית', 'מגורים', 'בית מגורים', 'כתובת מגורים'];

    const homeDonorPlace = await this.donorPlaceRepo.findFirst({
      donorId,
      isActive: true
    }, {
      include: {
        place: { include: { country: true } },
        addressType: true
      }
    });

    if (homeDonorPlace?.addressType?.description &&
      homeAddressTypes.includes(homeDonorPlace.addressType.description)) {
      return homeDonorPlace.place;
    }

    return undefined;
  }

  /**
   * Get primary email for a donor
   */
  async getPrimaryEmailForDonor(donorId: string): Promise<string | undefined> {
    const primaryEmail = await this.donorContactRepo.findFirst({
      donorId,
      type: 'email',
      isPrimary: true,
      isActive: true
    });

    return primaryEmail?.email || undefined;
  }

  /**
   * Get primary phone for a donor
   */
  async getPrimaryPhoneForDonor(donorId: string): Promise<string | undefined> {
    const primaryPhone = await this.donorContactRepo.findFirst({
      donorId,
      type: 'phone',
      isPrimary: true,
      isActive: true
    });

    return primaryPhone?.phoneNumber || undefined;
  }

  /**
   * Get birth date for a donor
   */
  async getBirthDateForDonor(donorId: string): Promise<Date | undefined> {
    const birthEvent = await this.eventRepo.findFirst({
      description: 'יום הולדת',
      isActive: true
    });

    if (!birthEvent) return undefined;

    const donorBirthEvent = await this.donorEventRepo.findFirst({
      donorId,
      eventId: birthEvent.id,
      isActive: true
    });

    return donorBirthEvent?.date || undefined;
  }

  /**
   * Build maps from loaded data for efficient lookup
   */
  private buildMaps(
    allPlaces: DonorPlace[],
    allContacts: DonorContact[],
    allBirthEvents: DonorEvent[],
    allDonations: Donation[]
  ) {
    const donorPlaceMap = new Map<string, Place>();
    const donorEmailMap = new Map<string, string>();
    const donorPhoneMap = new Map<string, string>();
    const donorFullAddressMap = new Map<string, string>();
    const donorBirthDateMap = new Map<string, Date>();
    const donorCountryIdMap = new Map<string, string>();
    const donorTotalDonationsMap = new Map<string, number>();
    const donorLastDonationDateMap = new Map<string, Date>();
    const donorLastDonationAmountMap = new Map<string, number>();
    const donorLastDonationCurrency = new Map<string, string>();
    const donorLastDonationReason = new Map<string, string>();

    // Process places
    allPlaces.forEach(dp => {
      if (dp.donorId && dp.place) {
        donorPlaceMap.set(dp.donorId, dp.place);
        if (dp.place.getDisplayAddress) {
          donorFullAddressMap.set(dp.donorId, dp.place.getDisplayAddress());
        }
        if (dp.place.countryId) {
          donorCountryIdMap.set(dp.donorId, dp.place.countryId);
        }
      }
    });

    // Process contacts
    allContacts.forEach(contact => {
      if (!contact.donorId) return;
      if (contact.type === 'email' && contact.email) {
        donorEmailMap.set(contact.donorId, contact.email);
      } else if (contact.type === 'phone' && contact.phoneNumber) {
        donorPhoneMap.set(contact.donorId, contact.phoneNumber);
      }
    });

    // Process birth dates
    allBirthEvents.forEach(de => {
      if (de.donorId && de.date) {
        donorBirthDateMap.set(de.donorId, de.date);
      }
    });

    // Process donations - calculate average per donor in last 12 months (excluding exceptional donations)
    const donorDonationsCount = new Map<string, number>();
    const donorDonationsSum = new Map<string, number>();

    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    allDonations.forEach(donation => {
      if (!donation.donorId) return;


      // Track last donation date and amount (for all donations, not just non-exceptional)
      if (donation.donationDate) {
        const currentLastDate = donorLastDonationDateMap.get(donation.donorId);
        if (!currentLastDate || new Date(donation.donationDate) > currentLastDate) {
          donorLastDonationDateMap.set(donation.donorId, new Date(donation.donationDate));
          donorLastDonationAmountMap.set(donation.donorId, donation.amount || 0);
          donorLastDonationCurrency.set(donation.donorId, donation.currencyId || 'ILS');
          donorLastDonationReason.set(donation.donorId, donation.reason || '');
        }
      }

      // Skip donations that have partners (shared donations)
      if (donation.partnerIds && donation.partnerIds.length > 0 && donation.partnerIds.includes(donation.donor?.id!)) return;

      // Skip donations older than 12 months for average calculation
      if (donation.donationDate && new Date(donation.donationDate) < twelveMonthsAgo) return;

      // Skip exceptional donations for average calculation
      if (donation.isExceptional) return;
      const currentSum = donorDonationsSum.get(donation.donorId) || 0;
      const currentCount = donorDonationsCount.get(donation.donorId) || 0;

      donorDonationsSum.set(donation.donorId, currentSum + (donation.amount || 0));
      donorDonationsCount.set(donation.donorId, currentCount + 1);
    });

    // Calculate average
    donorDonationsSum.forEach((sum, donorId) => {
      const count = donorDonationsCount.get(donorId) || 1;
      const average = sum / count;
      donorTotalDonationsMap.set(donorId, average);
    });

    return {
      donorPlaceMap,
      donorEmailMap,
      donorPhoneMap,
      donorFullAddressMap,
      donorBirthDateMap,
      donorCountryIdMap,
      donorTotalDonationsMap,
      donorDonationsCount,
      donorLastDonationDateMap,
      donorLastDonationAmountMap,
      donorLastDonationCurrency,
      donorLastDonationReason
    };
  }

  /**
   * Create empty maps
   */
  private createEmptyMaps() {
    return {
      donorPlaceMap: new Map<string, Place>(),
      donorEmailMap: new Map<string, string>(),
      donorPhoneMap: new Map<string, string>(),
      donorFullAddressMap: new Map<string, string>(),
      donorBirthDateMap: new Map<string, Date>(),
      donorCountryIdMap: new Map<string, string>(),
      donorTotalDonationsMap: new Map<string, number>(),
      donorDonationsCount: new Map<string, number>(),
      donorLastDonationDateMap: new Map<string, Date>(),
      donorLastDonationAmountMap: new Map<string, number>(),
      donorLastDonationCurrency: new Map<string, string>(),
      donorLastDonationReason: new Map<string, string>()
    };
  }
}