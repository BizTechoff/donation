import { Allow, BackendMethod, remult } from 'remult'
import { DonorContact } from '../entity/donor-contact'
import { DonorPhoneDisplay, splitPhones, toPhoneDisplay } from '../utils/phone-utils'

/**
 * DonorPhoneController - the ONE place that loads donors' phones (item 18).
 *
 * Eight places used to query donor_contacts on their own - with different
 * filters (primary only / active / everything), two of them in the browser -
 * and each then called phone-utils. Now they all ask here: one query, one
 * rule (active phone contacts, primary first), split into טלפון and נייד by
 * phone-utils.splitPhones.
 */
export class DonorPhoneController {

  /** For screens that load in the browser. donorId -> { phone, mobile }. */
  @BackendMethod({ allowed: Allow.authenticated })
  static async getDonorPhones(donorIds: string[]): Promise<Record<string, DonorPhoneDisplay>> {
    const split = await DonorPhoneController.load(donorIds)
    const out: Record<string, DonorPhoneDisplay> = {}
    for (const [id, s] of split) out[id] = toPhoneDisplay(s)
    return out
  }

  /** Backend - donorId -> landlines / mobiles (arrays, for callers that join their own way). */
  static async load(donorIds: string[]): Promise<Map<string, { landlines: string[]; mobiles: string[] }>> {
    const result = new Map<string, { landlines: string[]; mobiles: string[] }>()
    const ids = [...new Set((donorIds || []).filter(Boolean))]
    if (ids.length === 0) return result

    const contacts = await remult.repo(DonorContact).find({
      where: { donorId: { $in: ids }, type: 'phone', isActive: true }
    })
    const byDonor = new Map<string, DonorContact[]>()
    for (const c of contacts) {
      if (!c.donorId) continue
      const list = byDonor.get(c.donorId) || []
      list.push(c)
      byDonor.set(c.donorId, list)
    }
    for (const [id, list] of byDonor) result.set(id, splitPhones(list))
    return result
  }

  /** Backend - donorId -> { phone, mobile } display strings. */
  static async loadDisplay(donorIds: string[], separator: string = '\n'): Promise<Map<string, DonorPhoneDisplay>> {
    const split = await DonorPhoneController.load(donorIds)
    return new Map([...split].map(([id, s]) => [id, toPhoneDisplay(s, separator)]))
  }
}
