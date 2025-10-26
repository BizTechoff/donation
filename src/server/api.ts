import { createPostgresConnection } from 'remult/postgres'
import { remultExpress } from 'remult/remult-express'
import { SignInController, getUser } from '../app/users/SignInController'
import { UpdatePasswordController } from '../app/users/UpdatePasswordController'
import { DonorController } from '../shared/controllers/donor.controller'
import { Bank, Circle, Company, Contact, DonorAddress, DonorContact, DonorNote, DonorPlace, DonorReceptionHour, DonorRelation, NoteType, Organization } from '../shared/entity'
import { Blessing } from '../shared/entity/blessing'
import { Campaign } from '../shared/entity/campaign'
import { Certificate } from '../shared/entity/certificate'
import { Country } from '../shared/entity/country'
import { Donation } from '../shared/entity/donation'
import { DonationMethod } from '../shared/entity/donation-method'
import { DonationPartner } from '../shared/entity/donation-partner'
import { Donor } from '../shared/entity/donor'
import { DonorEvent } from '../shared/entity/donor-event'
import { Event } from '../shared/entity/event'
import { DonationFile } from '../shared/entity/file'
import { Place } from '../shared/entity/place'
import { Reminder } from '../shared/entity/reminder'
import { StandingOrder } from '../shared/entity/standing-order'
import { User } from '../shared/entity/user'
import { SeedController } from './SeedController'
import { LetterController } from '../shared/controllers/letter.controller'

export const entities = [
  User, Donor, Donation, Campaign, DonationMethod, StandingOrder, Reminder,
  Certificate, Event, DonorEvent, Blessing, Country, Place, DonationPartner,
  DonationFile, Contact, Bank, Organization, Company, Circle, DonorRelation, DonorAddress, DonorContact, DonorPlace, DonorNote, DonorReceptionHour, NoteType]
export const api = remultExpress({
  admin: true,
  controllers: [SignInController, UpdatePasswordController, SeedController, DonorController, LetterController],
  entities,
  getUser,
  dataProvider: async () => {
    return createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    })
  }
})
