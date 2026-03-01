import { Allow, BackendMethod, remult } from 'remult'
import { AppSettings } from '../entity/app-settings'
import { Roles } from '../enum/roles'

const SINGLETON_ID = 'singleton'

export class AppSettingsController {

  @BackendMethod({ allowed: Allow.authenticated })
  static async getSettings(): Promise<{ highDonorAmount: number; recentDonorMonths: number }> {
    const repo = remult.repo(AppSettings)
    let settings = await repo.findId(SINGLETON_ID, { createIfNotFound: true })
    if (settings!._.isNew()) {
      settings!.id = SINGLETON_ID
      settings = await repo.save(settings!)
    }
    return {
      highDonorAmount: settings!.highDonorAmount,
      recentDonorMonths: settings!.recentDonorMonths
    }
  }

  @BackendMethod({ allowed: Roles.admin })
  static async saveSettings(highDonorAmount: number, recentDonorMonths: number): Promise<{ highDonorAmount: number; recentDonorMonths: number }> {
    const repo = remult.repo(AppSettings)
    let settings = await repo.findId(SINGLETON_ID, { createIfNotFound: true })
    if (settings!._.isNew()) {
      settings!.id = SINGLETON_ID
    }
    settings!.highDonorAmount = highDonorAmount
    settings!.recentDonorMonths = recentDonorMonths
    settings = await repo.save(settings!)
    return {
      highDonorAmount: settings.highDonorAmount,
      recentDonorMonths: settings.recentDonorMonths
    }
  }
}
