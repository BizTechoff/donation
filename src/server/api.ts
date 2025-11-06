import cron from 'node-cron'
import { createPostgresConnection } from 'remult/postgres'
import { remultExpress } from 'remult/remult-express'
import { SignInController, getUser } from '../app/users/SignInController'
import { UpdatePasswordController } from '../app/users/UpdatePasswordController'
import { DonationController } from '../shared/controllers/donation.controller'
import { DonorMapController } from '../shared/controllers/donor-map.controller'
import { DonorController } from '../shared/controllers/donor.controller'
import { EmailController } from '../shared/controllers/email.controller'
import { FileController } from '../shared/controllers/file.controller'
import { LetterController } from '../shared/controllers/letter.controller'
import { PaymentController } from '../shared/controllers/payment.controller'
import { ReminderController } from '../shared/controllers/reminder.controller'
import { HebrewDateController } from '../shared/controllers/hebrew-date.controller'
import { TargetAudienceController } from '../shared/controllers/target-audience.controller'
import { Bank, Circle, Company, DonationBank, DonationOrganization, DonorAddressType, DonorContact, DonorGift, DonorNote, DonorPlace, DonorReceptionHour, DonorRelation, Gift, LetterTitle, NoteType, Organization, Payment, TargetAudience } from '../shared/entity'
import { Blessing } from '../shared/entity/blessing'
import { BlessingBookType } from '../shared/entity/blessing-book-type'
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
import { User } from '../shared/entity/user'
import { checkAndSendReminders } from './scheduler'
import { CertificateController } from '../shared/controllers/certificate.controller'
import { ReportController } from '../shared/controllers/report.controller'

export const entities = [
  User, Donor, Donation, Campaign, DonationMethod, Reminder,
  Certificate, Event, DonorEvent, Blessing, Country, Place, DonationPartner,
  DonationFile, Bank, Organization, Company, Circle, DonorRelation, DonorContact, 
  DonorPlace, DonorNote, DonorReceptionHour, NoteType, DonationBank, DonationOrganization, 
  Payment, DonorAddressType, BlessingBookType, LetterTitle, Gift, DonorGift, TargetAudience]
export const api = remultExpress({
  admin: true,
  controllers: [SignInController, UpdatePasswordController, DonorController,
    DonationController, LetterController, FileController, PaymentController,
    DonorMapController, ReminderController, HebrewDateController, TargetAudienceController,
    CertificateController, EmailController, ReportController],
  entities,
  getUser,
  dataProvider: async () => {
    return createPostgresConnection({
      configuration: 'heroku',
      sslInDev: !(process.env['DEV_MODE'] === 'DEV')
    })
  },
  initApi: async r => {
    // Setup cron job to check reminders every 5 minutes
    console.log('[Server] Setting up reminder scheduler (every 5 minutes)...')
    cron.schedule('*/5 * * * *', async () => {
      // cron.schedule('*/1 * * * *', async () => {
      console.log('[Cron] Running reminder check at:', new Date().toISOString())
      await checkAndSendReminders()
    })

    // Run once on startup
    console.log('[Server] Running initial reminder check...')
    await checkAndSendReminders()
  }

})
