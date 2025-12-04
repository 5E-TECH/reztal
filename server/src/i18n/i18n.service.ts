import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Language } from 'src/common/enums';

// export type Language = 'uz' | 'ru' | 'en';

export interface Translation {
  [key: string]: any;
}

@Injectable()
export class I18nService {
  private translations: Record<Language, Translation> = {
    uz: {},
    ru: {},
    en: {},
  };

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations(): void {
    const i18nDir = path.join(process.cwd(), 'src', 'i18n');

    try {
      // Load Uzbek
      const uzPath = path.join(i18nDir, 'uz.json');
      if (fs.existsSync(uzPath)) {
        this.translations.uz = JSON.parse(fs.readFileSync(uzPath, 'utf8'));
      }

      // Load Russian
      const ruPath = path.join(i18nDir, 'ru.json');
      if (fs.existsSync(ruPath)) {
        this.translations.ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
      }

      // Load English
      const enPath = path.join(i18nDir, 'en.json');
      if (fs.existsSync(enPath)) {
        this.translations.en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  }

  getTranslation(lang: Language): Translation {
    return this.translations[lang] || this.translations.uz;
  }

  t(lang: Language, key: string, params?: Record<string, any>): string {
    const translation = this.getTranslation(lang);

    const keys = key.split('.');
    let value: any = translation;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value === 'string' && params) {
      return this.replaceParams(value, params);
    }

    return typeof value === 'string' ? value : key;
  }

  private replaceParams(text: string, params: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  translate(lang: Language, key: string, params?: Record<string, any>): string {
    return this.t(lang, key, params);
  }

  getKeyboard(lang: Language, keyboardType: string): any {
    const translation = this.getTranslation(lang);

    switch (keyboardType) {
      case 'main':
        return {
          keyboard: [[translation.rezume, translation.vacancy]],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'admin':
        return {
          keyboard: [
            [translation.pending_posts],
            [translation.statistics, translation.admins],
            [translation.add_admin],
            [translation.back_to_main],
          ],
          resize_keyboard: true,
        };

      case 'confirmation':
        return {
          keyboard: [[translation.confirmation, translation.edit]],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'gender':
        return {
          keyboard: [[translation.gender.male, translation.gender.female]],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'regions':
        return {
          keyboard: translation.regions,
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'languages':
        const langButtons = translation.languages;
        return {
          keyboard: [
            [langButtons[0], langButtons[1]],
            [langButtons[2], langButtons[3]],
            [langButtons[4]],
            [langButtons[5]],
          ],
          resize_keyboard: true,
        };

      case 'work_types':
        const workButtons = translation.work_types;
        return {
          keyboard: [[workButtons[0], workButtons[1]], [workButtons[2]]],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'phone':
        return {
          keyboard: [
            [{ text: translation.phone_request, request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        };

      case 'language_selector':
        return {
          inline_keyboard: [
            [
              { text: '🇺🇿 Oʻzbekcha', callback_data: 'lang_uz' },
              { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
              { text: '🇺🇸 English', callback_data: 'lang_en' },
            ],
          ],
        };

      default:
        return { remove_keyboard: true };
    }
  }

  getQuestions(lang: Language, type: 'rezume' | 'vacancy'): string[] {
    const translation = this.getTranslation(lang);
    return translation[`${type}_questions`] || [];
  }
}
