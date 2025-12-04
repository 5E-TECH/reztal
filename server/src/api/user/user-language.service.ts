import { Injectable } from '@nestjs/common';
import { Language } from '../../i18n/i18n.service';

@Injectable()
export class UserLanguageService {
  private userLanguages = new Map<string, Language>();

  setUserLanguage(userId: string, lang: Language): void {
    this.userLanguages.set(userId, lang);
  }

  getUserLanguage(userId: string): Language {
    return this.userLanguages.get(userId) || 'uz';
  }

  deleteUserLanguage(userId: string): void {
    this.userLanguages.delete(userId);
  }

  hasLanguage(userId: string): boolean {
    return this.userLanguages.has(userId);
  }
}
