import { remultExpress } from 'remult/remult-express'
import { User, Donor, Donation, Campaign, DonationMethod } from '../../shared/entity'

export const api = remultExpress({
  entities: [User, Donor, Donation, Campaign, DonationMethod]
})