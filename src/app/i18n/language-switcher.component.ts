import { Component } from '@angular/core'
import { I18nService, Language } from './i18n.service'

@Component({
  selector: 'app-language-switcher',
  template: `
    <div class="language-switcher">
      <button 
        class="language-button"
        (click)="toggleLanguage()"
        [title]="getToggleTooltip()">
        <span class="language-flag">{{ getCurrentLanguageFlag() }}</span>
        <span class="language-text">{{ getCurrentLanguageName() }}</span>
        <span class="switch-icon">⇄</span>
      </button>
      
      <!-- Alternative dropdown style -->
      <select 
        *ngIf="showDropdown"
        class="language-select"
        [value]="i18n.currentLanguage"
        (change)="onLanguageChange($event)">
        <option 
          *ngFor="let lang of availableLanguages" 
          [value]="lang.code">
          {{ lang.name }}
        </option>
      </select>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .language-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .language-button:hover {
      background: #f5f5f5;
      border-color: #999;
    }

    .language-flag {
      font-size: 16px;
    }

    .language-text {
      font-weight: 500;
    }

    .switch-icon {
      opacity: 0.6;
      font-size: 12px;
    }

    .language-select {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    }

    /* RTL Support */
    :host[dir="rtl"] .language-button {
      flex-direction: row-reverse;
    }

    :host[dir="rtl"] .language-switcher {
      flex-direction: row-reverse;
    }
  `]
})
export class LanguageSwitcherComponent {
  showDropdown = false
  
  constructor(public i18n: I18nService) {}

  get availableLanguages() {
    return this.i18n.getAvailableLanguages()
  }

  toggleLanguage(): void {
    this.i18n.switchLanguage()
  }

  onLanguageChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    const language = target.value as Language
    this.i18n.setLanguage(language)
  }

  getCurrentLanguageFlag(): string {
    return this.i18n.currentLanguage === 'he' ? '🇮🇱' : '🇺🇸'
  }

  getCurrentLanguageName(): string {
    const currentLang = this.availableLanguages.find(
      lang => lang.code === this.i18n.currentLanguage
    )
    return currentLang?.name || ''
  }

  getToggleTooltip(): string {
    const otherLang = this.availableLanguages.find(
      lang => lang.code !== this.i18n.currentLanguage
    )
    return this.i18n.currentLanguage === 'he' 
      ? `עבור ל${otherLang?.name}`
      : `Switch to ${otherLang?.name}`
  }
}