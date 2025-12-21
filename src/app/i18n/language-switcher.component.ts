import { Component } from '@angular/core'
import { I18nService } from './i18n.service'

@Component({
  selector: 'app-language-switcher',
  template: `
    <button 
      mat-icon-button
      class="language-switcher-button"
      (click)="toggleLanguage()"
      [title]="getToggleTooltip()"
      [attr.aria-label]="getToggleTooltip()">
      <mat-icon class="language-icon">{{ getCurrentLanguageIcon() }}</mat-icon>
    </button>
  `,
  styles: [`
    .language-switcher-button {
      color: rgba(255, 255, 255, 0.8);
      transition: all 0.2s ease;
    }

    .language-switcher-button:hover {
      color: rgba(255, 255, 255, 1);
      background-color: rgba(255, 255, 255, 0.1);
    }

    .language-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }
    
    @media (max-width: 768px) {
      .language-switcher-button {
        padding: 8px;
      }
      
      .language-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
      }
    }
  `]
})
export class LanguageSwitcherComponent {
  constructor(public i18n: I18nService) { }

  get availableLanguages() {
    return this.i18n.getAvailableLanguages()
  }

  toggleLanguage(): void {
    this.i18n.switchLanguage()
    window?.location.reload()
  }

  getCurrentLanguageIcon(): string {
    return this.i18n.currentLanguage === 'he' ? 'language' : 'translate'
  }

  getToggleTooltip(): string {
    return this.i18n.currentLanguage === 'he'
      ? 'Switch to English'
      : 'עבור לעברית'
  }
}