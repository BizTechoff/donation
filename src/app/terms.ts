// Backward compatibility - re-export from new i18n system
import { I18nService } from './i18n/i18n.service'

// Create a proxy object that gets terms from the i18n service
const i18nService = new I18nService()

export const terms = new Proxy({}, {
  get(target: any, prop: string | symbol) {
    if (typeof prop === 'string') {
      return i18nService.getTermSafe(prop as any, prop)
    }
    return undefined
  }
})

// Export the i18n service for direct access
export { i18nService }
