import { createPostgresConnection } from 'remult/postgres'
import { remultExpress } from 'remult/remult-express'
import { SignInController, getUser } from '../app/users/SignInController'
import { UpdatePasswordController } from '../app/users/UpdatePasswordController'
import { Campaign } from '../shared/entity/campaign'
import { Donation } from '../shared/entity/donation'
import { DonationMethod } from '../shared/entity/donation-method'
import { Donor } from '../shared/entity/donor'
import { Reminder } from '../shared/entity/reminder'
import { StandingOrder } from '../shared/entity/standing-order'
import { User } from '../shared/entity/user'
import { Certificate } from '../shared/entity/certificate'

export const entities = [User, Donor, Donation, Campaign, DonationMethod, StandingOrder, Reminder, Certificate]
export const api = remultExpress({
  admin: true,
  controllers: [SignInController, UpdatePasswordController],
  entities,
  getUser,
  dataProvider: async () => {
    return createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    })
  }
})
