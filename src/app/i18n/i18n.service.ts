import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { termsHe } from './terms.he'
import { termsEn } from './terms.en'

export type Language = 'he' | 'en'
export type Terms = typeof termsHe

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly LANGUAGE_KEY = 'donation_app_language'
  
  private languageSubject = new BehaviorSubject<Language>('he')
  private termsSubject = new BehaviorSubject<Terms>(termsHe)

  public language$ = this.languageSubject.asObservable()
  public terms$ = this.termsSubject.asObservable()

  private termsDictionary: Record<Language, Terms> = {
    he: termsHe,
    en: termsEn
  }

  constructor() {
    this.loadSavedLanguage()
  }

  get currentLanguage(): Language {
    return this.languageSubject.value
  }

  get currentTerms(): Terms {
    return this.termsSubject.value
  }

  get terms(): Terms {
    return this.termsSubject.value
  }

  get lang(): Terms {
    return this.termsSubject.value
  }

  get isRTL(): boolean {
    return this.currentTerms.RTL as boolean
  }

  setLanguage(language: Language): void {
    if (language !== this.currentLanguage) {
      this.languageSubject.next(language)
      this.termsSubject.next(this.termsDictionary[language])
      this.saveLanguage(language)
      this.updateDocumentDirection()
    }
  }

  switchLanguage(): void {
    const newLanguage: Language = this.currentLanguage === 'he' ? 'en' : 'he'
    this.setLanguage(newLanguage)
  }

  getAvailableLanguages(): Array<{code: Language, name: string}> {
    return [
      { code: 'he', name: 'עברית' },
      { code: 'en', name: 'English' }
    ]
  }

  private loadSavedLanguage(): void {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const savedLanguage = localStorage.getItem(this.LANGUAGE_KEY) as Language
        if (savedLanguage && this.termsDictionary[savedLanguage]) {
          this.setLanguage(savedLanguage)
        } else {
          // Default to Hebrew if no saved language or invalid language
          this.setLanguage('he')
        }
      } else {
        // Server-side or non-browser environment - use default
        this.setLanguage('he')
      }
    } catch (error) {
      console.warn('Could not load saved language, using default (Hebrew)', error)
      this.setLanguage('he')
    }
  }

  private saveLanguage(language: Language): void {
    try {
      // Only save if we're in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.LANGUAGE_KEY, language)
      }
    } catch (error) {
      console.warn('Could not save language preference', error)
    }
  }

  private updateDocumentDirection(): void {
    // Only update document if we're in browser environment
    if (typeof document !== 'undefined') {
      const direction = this.isRTL ? 'rtl' : 'ltr'
      document.documentElement.setAttribute('dir', direction)
      document.documentElement.setAttribute('lang', this.currentLanguage)
    }
  }

  // Utility method to get a specific term by key
  getTerm(key: keyof Terms): string {
    return this.currentTerms[key] as string
  }

  // Utility method to get terms with fallback
  getTermSafe(key: keyof Terms, fallback?: string): string {
    const term = this.currentTerms[key] as string
    return term || fallback || key.toString()
  }
  
}
