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

  getKeyboard(
    lang: Language,
    keyboardType: string,
    currentPage?: number,
    totalPages?: number,
  ): any {
    const translation = this.getTranslation(lang);

    switch (keyboardType) {
      case 'main':
        return {
          keyboard: [
            [translation.rezume, translation.vacancy, translation.announcement],
          ],
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

      case 'level':
        return {
          keyboard: [
            [
              translation.level.junior,
              translation.level.middle,
              translation.level.senior,
            ],
          ],
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

      case 'paginate':
        const buttons: object[] = [];

        // Oldingi sahifa tugmasi
        if (currentPage && currentPage > 1) {
          buttons.push({
            text: translation.paginate_btns.previous,
            callback_data: 'paginate_prev',
          });
        }

        // Sahifa raqami
        if (currentPage && totalPages) {
          buttons.push({
            text: `${currentPage} / ${totalPages}`,
            callback_data: 'noop',
          });
        }

        // Keyingi sahifa tugmasi
        if (currentPage && totalPages && currentPage < totalPages) {
          buttons.push({
            text: translation.paginate_btns.next,
            callback_data: 'paginate_next',
          });
        }

        return { inline_keyboard: [buttons] };

      default:
        return { remove_keyboard: true };
    }
  }

  getCategoryKeyboard(lang: Language): any {
    const translation = this.getTranslation(lang);

    if (!translation.category || !translation.category.categories) {
      console.error(`No categories found for language: ${lang}`);
      return { remove_keyboard: true };
    }

    // Categorylarni olamiz
    const categories = translation.category.categories;

    // Har bir category name ni button qilamiz
    const keyboard = categories.map((cat: any) => [{ text: cat.name }]);

    // Orqaga qaytish tugmasi ham qo'shib qo'yamiz
    keyboard.push([{ text: translation.category.back }]);

    return {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  getSubCategoryKeyboard(lang: Language, categoryName: string): any {
    const translation = this.getTranslation(lang);

    // 1-variant: Agar category ichida categories bo'lsa
    if (translation.category && translation.category.categories) {
      const category = translation.category.categories.find(
        (c: any) => c.name === categoryName,
      );

      if (!category) {
        return { remove_keyboard: true };
      }

      const subs = category.sub_categories || [];

      const keyboard = subs.map((s: string) => [{ text: s }]);
      keyboard.push([{ text: translation.category.back }]);

      return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
    }

    // 2-variant: Agar to'g'ridan-to'g'ri categories bo'lsa
    else if (translation.categories) {
      const category = translation.categories.find(
        (c: any) => c.name === categoryName,
      );

      if (!category) {
        return { remove_keyboard: true };
      }

      const subs = category.sub_categories || [];
      const keyboard = subs.map((s: string) => [{ text: s }]);

      // Orqaga tugmasi
      if (translation.category?.back) {
        keyboard.push([{ text: translation.category.back }]);
      } else if (translation.back) {
        keyboard.push([{ text: translation.back }]);
      }

      return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
    }

    // 3-variant: Agar strukturani topmasa
    else {
      console.error('❌ No categories found in translation:', {
        hasCategory: !!translation.category,
        hasCategories: !!translation.categories,
        keys: Object.keys(translation),
      });

      return { remove_keyboard: true };
    }
  }

  getQuestions(lang: Language, type: 'rezume' | 'vacancy'): string[] {
    const translation = this.getTranslation(lang);
    return translation[`${type}_questions`] || [];
  }
}
