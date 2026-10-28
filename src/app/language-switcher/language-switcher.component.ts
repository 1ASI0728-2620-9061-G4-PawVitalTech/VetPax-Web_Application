import { Component } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { TranslateService } from '@ngx-translate/core';

/**
 * Component that provides language switching functionality in the application.
 * Displays a toggle group of buttons for available languages and handles language changes.
 *
 * @remarks
 * This is a standalone component that uses Material Design button toggle components
 * for the language selection interface.
 *
 * @example
 * ```html
 * <app-language-switcher></app-language-switcher>
 * ```
 */

@Component({
  selector: 'app-language-switcher',
  standalone:true,
  imports: [
    MatButtonToggle,
    MatButtonToggleGroup,
  ],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css'
})
export class LanguageSwitcherComponent {
  /** Currently active language code */
  protected currentLang: string = 'en';

  /** List of available language codes */
  protected languages: string[] = ['en', 'es'];

  /**
   * Creates an instance of LanguageSwitcherComponent.
   * Initializes the current language from the translation service.
   *
   * @param translate - The translation service for handling language changes
   */
  constructor(private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || 'en';
  }

  /**
   * Changes the application's current language.
   * Updates both the translation service and the component's local state.
   *
   * @param language - The language code to switch to (e.g., 'en', 'es')
   */
  useLanguage(language: string) {
    this.translate.use(language);
    this.currentLang = language;
    localStorage.setItem('app-lang', language);
  }
}
