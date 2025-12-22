import { Update, Start, On, Ctx, Action, Command } from 'nestjs-telegraf';
import { Context, NarrowedContext } from 'telegraf';
import { BotRezumeService as BotRezumeService } from '../bot/bot-rezume/rezume/bot.rezume.service';
import { BotVacancyService as BotVacancyService } from '../bot/bot-vacancy/vacancy/bot.service';
import { BotAdminService } from './bot-admin/bot.admin.service';

// I18n service import qilish kerak
import { I18nService } from '../../i18n/i18n.service';
// import type { Language } from '../../i18n/i18n.service';
import { UserLanguageService } from '../../api/user/user-language.service';
import {
  Language,
  Level,
  Post_Status,
  Post_Type,
  Roles,
  Work_Format,
} from 'src/common/enums';
import { UserService } from '../user/user.service';
import { JobPostsService } from '../job-posts/job-posts.service';
import { JobPostsTelegramService } from '../job-posts-telegram/job-posts-telegram.service';
import { FILTER_FIELDS } from './common/work-filter-question';
import { BotSearchWorkService } from './bot-rezume/search-work/bot.search-work.service';
import config from 'src/config';
import path from 'path';
import { existsSync, createReadStream } from 'fs';
const API_PREFIX = 'api/v1';

type BotContext = Context & {
  session: any;
  lang?: Language;
};

interface ServiceResponse {
  confirmation?: boolean;
  answers?: any;
  gender?: any;
  message?: string;
  keyboard?: any;
}

@Update()
export class BotMainUpdate {
  constructor(
    private botRezumeService: BotRezumeService,
    private botVacancyService: BotVacancyService,
    private botAdminService: BotAdminService,
    private i18nService: I18nService,
    private userLanguageService: UserLanguageService,
    private userService: UserService,
    private jobPostsService: JobPostsService,
    private jobPostsTelegramService: JobPostsTelegramService,
    private botSerchWorkService: BotSearchWorkService,
  ) {}

  // ===== TARJIMA YORDAMCHI FUNKSIYASI =====
  private t(lang: Language, key: string, params?: Record<string, any>): string {
    return this.i18nService.t(lang, key, params);
  }

  // ===== KEYBOARD LAR (DYNAMIC) =====
  private getConfirmationKeyboard(lang: Language) {
    return {
      keyboard: [[this.t(lang, 'confirmation'), this.t(lang, 'edit')]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  // ===== YANGI KEYBOARD LAR =====
  private getRezumeSubmenuKeyboard(lang: Language) {
    return {
      keyboard: [
        [this.t(lang, 'search_job'), this.t(lang, 'fill_rezume')],
        [this.t(lang, 'back_to_main')],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  private getVacancySubmenuKeyboard(lang: Language) {
    return {
      keyboard: [
        [this.t(lang, 'search_employee'), this.t(lang, 'fill_vacancy')],
        [this.t(lang, 'back_to_main')],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  private getRezumeEditKeyboard(lang: Language) {
    const fields = this.t(lang, 'edit_fields.rezume').split(', ');
    return {
      keyboard: [
        [
          `1. ${fields[0].split(': ')[1]}`,
          `2. ${fields[1].split(': ')[1]}`,
          `3. ${fields[2].split(': ')[1]}`,
        ],
        [
          `4. ${fields[3].split(': ')[1]}`,
          `5. ${fields[4].split(': ')[1]}`,
          `6. ${fields[5].split(': ')[1]}`,
        ],
        [
          `7. ${fields[6].split(': ')[1]}`,
          `8. ${fields[7].split(': ')[1]}`,
          `9. ${fields[8].split(': ')[1]}`,
        ],
        [
          `10. ${fields[9].split(': ')[1]}`,
          `11. ${fields[10].split(': ')[1]}`,
          `12. ${fields[11].split(': ')[1]}`,
        ],
        [`✅ ${this.t(lang, 'confirmation')}`],
      ],
      resize_keyboard: true,
    };
  }

  private getVacancyEditKeyboard(lang: Language) {
    const fields = this.t(lang, 'edit_fields.vacancy').split(', ');
    return {
      keyboard: [
        [
          `1. ${fields[0].split(': ')[1]}`,
          `2. ${fields[1].split(': ')[1]}`,
          `3. ${fields[2].split(': ')[1]}`,
        ],
        [
          `4. ${fields[3].split(': ')[1]}`,
          `5. ${fields[4].split(': ')[1]}`,
          `6. ${fields[5].split(': ')[1]}`,
        ],
        [`7. ${fields[6].split(': ')[1]}`, `8. ${fields[7].split(': ')[1]}`],
        [`✅ ${this.t(lang, 'confirmation')}`],
      ],
      resize_keyboard: true,
    };
  }

  // ===== FORMAT FUNCTIONS =====
  private formatSalary(salary: string): string {
    if (!salary) return '';
    const cleaned = salary.trim();
    if (/^\d+$/.test(cleaned)) {
      return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return salary;
  }

  private formatPhone(phone: string): string {
    if (!phone) return '';

    // Faqat raqamlarni qoldirish
    const cleaned = phone.replace(/\D/g, '');

    // Agar 998 bilan boshlanmasa
    // if (cleaned.startsWith('998') && cleaned.length === 12) {
    //   return `+${cleaned}`;
    // }

    // Agar +998 bilan boshlanmasa
    if (cleaned.startsWith('+998') && cleaned.length === 13) {
      return cleaned;
    }

    // Agar contact orqali kelsa (faqat raqamlar)
    // if (cleaned.length === 12) {
    //   return `+${cleaned}`;
    // }

    // Agar 9 bilan boshlansa (contactda + yo'q)
    // if (cleaned.length === 13 && cleaned.startsWith('9')) {
    //   return `+${cleaned}`;
    // }

    return phone;
  }

  private formatUsername(username: string): string {
    if (!username) return '';
    let cleaned = username.replace(/@/g, '');
    if (!cleaned.trim()) return '';
    return `@${cleaned}`;
  }

  private mapWorkFormat(text: string, lang: Language): Work_Format | null {
    const translation = this.i18nService.getTranslation(lang);
    const list: string[] = translation.work_types || [];
    const idx = list.indexOf(text);
    if (idx === 0) return Work_Format.OFFLINE;
    if (idx === 1) return Work_Format.ONLINE;
    if (idx === 2) return Work_Format.GIBRID;

    const lowered = text.toLowerCase();
    if (lowered === Work_Format.OFFLINE) return Work_Format.OFFLINE;
    if (lowered === Work_Format.ONLINE) return Work_Format.ONLINE;
    if (lowered === Work_Format.GIBRID) return Work_Format.GIBRID;
    return null;
  }

  private mapLevel(text: string, lang: Language): Level | null {
    if (!text) return null;
    const translation = this.i18nService.getTranslation(lang);
    const levelMap = translation.level || {};
    const lowered = text.toLowerCase();

    const matchedKey = Object.keys(levelMap || {}).find(
      (k) => (levelMap as any)[k]?.toLowerCase?.() === lowered,
    );

    if (matchedKey && (matchedKey as Level)) {
      return matchedKey as Level;
    }

    if (lowered === Level.JUNIOR) return Level.JUNIOR;
    if (lowered === Level.MIDDLE) return Level.MIDDLE;
    if (lowered === Level.SENIOR) return Level.SENIOR;

    return null;
  }

  private getFieldLabel(field: string, lang: Language): string {
    switch (field) {
      case 'level':
        return this.t(lang, 'filter_labels.level');
      case 'work_format':
        return this.t(lang, 'filter_labels.work_format');
      case 'location':
        return this.t(lang, 'filter_labels.location');
      case 'category':
        return this.t(lang, 'filter_labels.category');
      default:
        return field;
    }
  }

  private getBackToMainKeyboard(lang: Language) {
    return {
      keyboard: [[this.t(lang, 'back_to_main')]],
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }

  private async sendBackToMainShortcut(ctx: BotContext, lang: Language) {
    await ctx.reply(this.t(lang, 'back_to_main_prompt'), {
      reply_markup: this.getBackToMainKeyboard(lang),
    });
  }

  private resetSearchState(
    ctx: BotContext,
    lang: Language,
    mode: 'vacancy' | 'resume' = 'vacancy',
  ) {
    this.clearLastResultMessage(ctx);
    ctx.session = {
      ...(ctx.session || {}),
      step: 0,
      filter: {
        sub_category: null,
        work_format: null,
        level: null,
        location: null,
        page: 1,
        language: lang,
      },
      category: null,
      searchMode: mode,
    };

    (ctx as any).lang = lang;
  }

  private async clearLastResultMessage(ctx: BotContext) {
    try {
      if (ctx.session?.lastResultMessageId && ctx.chat?.id) {
        await ctx.telegram.deleteMessage(
          ctx.chat.id,
          ctx.session.lastResultMessageId,
        );
      }
    } catch (err) {
      console.log('Failed to delete last result message:', err?.message);
    } finally {
      if (ctx.session) {
        ctx.session.lastResultMessageId = null;
      }
    }
  }

  // ===== VALIDATION FUNCTIONS =====
  private isValidRegion(region: string, lang: Language): boolean {
    const langsToCheck: Language[] = [lang, Language.UZ, Language.RU, Language.EN].filter(
      (v, idx, arr) => arr.indexOf(v) === idx,
    );
    for (const l of langsToCheck) {
      const regions = this.i18nService.getKeyboard(l, 'regions').keyboard.flat();
      if (regions.includes(region)) {
        return true;
      }
    }
    return false;
  }

  private getRegionVariants(region: string, lang: Language): string[] {
    const langsToCheck: Language[] = [lang, Language.UZ, Language.RU, Language.EN].filter(
      (v, idx, arr) => arr.indexOf(v) === idx,
    );

    const toIndexedMap = (l: Language) => {
      const keyboard = this.i18nService.getKeyboard(l, 'regions').keyboard;
      const map: Record<string, string> = {};
      keyboard.forEach((row: any[], rowIdx: number) => {
        row.forEach((item: string, colIdx: number) => {
          map[`${rowIdx}-${colIdx}`] = item;
        });
      });
      return map;
    };

    const indexedByLang: Record<Language, Record<string, string>> = {} as any;
    for (const l of langsToCheck) {
      indexedByLang[l] = toIndexedMap(l);
    }

    let matchedIndex: string | null = null;
    for (const l of langsToCheck) {
      const entries = Object.entries(indexedByLang[l]);
      const found = entries.find(([, value]) => value === region);
      if (found) {
        matchedIndex = found[0];
        break;
      }
    }

    if (!matchedIndex) {
      return [region];
    }

    const variants = langsToCheck
      .map((l) => indexedByLang[l][matchedIndex])
      .filter(Boolean);

    // Default to Uzbek variant if available for consistent DB lookups
    const uzVariant = indexedByLang[Language.UZ]?.[matchedIndex];
    if (uzVariant) {
      variants.unshift(uzVariant);
    }

    return Array.from(new Set(variants));
  }

  private isValidWorkType(workType: string, lang: Language): boolean {
    const workTypes = this.i18nService
      .getKeyboard(lang, 'work_types')
      .keyboard.flat();
    return workTypes.includes(workType);
  }

  private isValidPhone(
    phone: string,
    lang: Language,
  ): { isValid: boolean; message?: string } {
    if (!phone) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.required'),
      };
    }

    const cleaned = phone.replace(/[^\d+]/g, '');

    if (!cleaned.startsWith('+998') && !cleaned.startsWith('998')) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.phone_invalid'),
      };
    }

    let length = cleaned.length;
    if (cleaned.startsWith('+')) {
      length = cleaned.length;
    } else if (cleaned.startsWith('998')) {
      length = cleaned.length;
    }

    if (length !== 13 && length !== 12) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.phone_invalid'),
      };
    }

    const numbers = cleaned.replace(/\D/g, '');
    if (numbers.length !== 12) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.phone_invalid'),
      };
    }

    return { isValid: true };
  }

  private isValidSalary(
    salary: string,
    lang: Language,
  ): {
    isValid: boolean;
    message?: string;
  } {
    if (!salary) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.required'),
      };
    }

    if (salary.trim().length === 0) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.required'),
      };
    }

    if (salary.length > 50) {
      return {
        isValid: false,
        message: this.t(lang, 'errors.salary_invalid'),
      };
    }

    return { isValid: true };
  }

  private clearAllStates(chatId: string) {
    this.botRezumeService.deleteUserState(chatId);
    this.botVacancyService.deleteEmployerState(chatId);
    this.botAdminService.deleteAdminState(chatId);
  }

  private getMyPostsKeyboard(page: number, totalPages: number, post: any) {
    const keyboard: any[] = [];

    // View count (display-only)
    keyboard.push([
      {
        text: `👁️ ${post.view_count ?? 0}`,
        callback_data: 'view_count',
      },
    ]);

    // Delete button
    keyboard.push([
      {
        text: '🗑 O\'chirish',
        callback_data: `mypost_delete_${post.id || post.post_id}`,
      },
    ]);

    const paginationRow: any[] = [];
    if (page > 1) {
      paginationRow.push({
        text: '⬅️',
        callback_data: 'mypost_prev',
      });
    }

    paginationRow.push({
      text: `${page}/${totalPages}`,
      callback_data: 'noop',
    });

    if (page < totalPages) {
      paginationRow.push({
        text: '➡️',
        callback_data: 'mypost_next',
      });
    }

    keyboard.push(paginationRow);

    return { inline_keyboard: keyboard };
  }

  private resolvePhotoSource(imagePath?: string) {
    const fallback = 'https://via.placeholder.com/400x200?text=No+Image';
    if (!imagePath) return { photo: fallback, used: fallback };

    const trimmed = imagePath.trim();
    if (trimmed.startsWith('http')) {
      return { photo: trimmed, used: trimmed };
    }

    const candidates = [
      path.isAbsolute(trimmed) ? trimmed : null,
      path.join(process.cwd(), 'uploads', path.basename(trimmed)),
      path.join(process.cwd(), 'src', 'uploads', path.basename(trimmed)),
      path.join(process.cwd(), '..', 'uploads', path.basename(trimmed)),
    ].filter(Boolean) as string[];

    const found = candidates.find((p) => existsSync(p));
    if (found) {
      return { photo: { source: createReadStream(found) }, used: found };
    }

    return { photo: fallback, used: fallback };
  }

  private formatMyPostCaption(post: any, lang: Language) {
    const subCatName =
      post.subCategory?.translations?.find((t) => t.lang === lang)?.name ||
      post.subCategory?.translations?.[0]?.name ||
      this.t(lang, 'unknown');

    const base = `#${post.type?.toUpperCase() || 'POST'}\n▫️ ${subCatName}`;

    if (post.type === Post_Type.VACANCY) {
      return `${base}
💰 ${post.salary || '...'}
📍 ${post.address || '...'}
🧑‍💼 ${post.user?.company_name || this.t(lang, 'unknown')}
☎️ ${post.user?.phone_number || '...'}
👤 ${post.telegram_username || '...'}`;
    }

    return `${base}
💰 ${post.salary || '...'}
📍 ${post.address || '...'}
🧑‍💻 ${post.user?.name || this.t(lang, 'unknown')}
☎️ ${post.user?.phone_number || '...'}
👤 ${post.telegram_username || '...'}`;
  }

  // ===== START COMMAND =====
  @Start()
  async start(@Ctx() ctx: BotContext) {
    const chatId = ctx.chat!.id.toString();

    const userId = ctx.from!.id.toString();

    // Eski natija xabarini tozalash
    await this.clearLastResultMessage(ctx);

    ctx.session = {
      step: 0,
      filter: {
        sub_category: null,
        work_format: null,
        level: null,
        location: null,
        page: 1,
        language: Language.UZ,
      },
      category: null,
      searchMode: 'vacancy',
      lastResultMessageId: null,
      lastFilters: null,
    };

    this.clearAllStates(chatId);

    // Barcha state larni tozalash
    this.botRezumeService.deleteUserState(chatId);
    this.botVacancyService.deleteEmployerState(chatId);
    this.botAdminService.deleteAdminState(chatId);

    // Til tanlashni taklif qilish
    await ctx.reply(
      '🇺🇿🇷🇺🇺🇸 ' +
        this.t(Language.UZ, 'choose_language') +
        '\n' +
        this.t(Language.RU, 'choose_language') +
        '\n' +
        this.t(Language.EN, 'choose_language'),
      {
        reply_markup: this.i18nService.getKeyboard(
          Language.UZ,
          'language_selector',
        ),
      },
    );
  }

  // ===== TIL TANLASH =====
  @Action(/lang_(uz|ru|en)/)
  async handleLanguageSelection(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const userId = ctx.from!.id.toString();
    const chatId = ctx.chat!.id.toString();
    const data = callbackQuery.data;

    const selectedLang = data.replace('lang_', '') as Language;

    if (['uz', 'ru', 'en'].includes(selectedLang)) {
      this.userLanguageService.setUserLanguage(userId, selectedLang);

      await ctx.answerCbQuery(this.t(selectedLang, 'language_selected'));

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.error("Xabarni o'chirishda xato:", error);
      }
      await this.showMainMenu(ctx, selectedLang);
    }
  }

  @Action(/contact_(.+)/)
  async handleContactClick(ctx) {
    try {
      const postId = ctx.match[1];
      const post: any = await this.jobPostsService.findByPostId(postId);
      if (!post) {
        await ctx.answerCbQuery('Post topilmadi', { show_alert: true });
        return;
      }

      const redirectKey = (post as any).post_id || (post as any).id || postId;

      const redirectHost =
        config.PROD_HOST || config.HOST_URL || 'https://t.me/Reztalpost';
      const safeRedirectHost = redirectHost.startsWith('http://')
        ? redirectHost.replace('http://', 'https://')
        : redirectHost.startsWith('https://')
          ? redirectHost
          : `https://${redirectHost}`;
      const redirectUrl = `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}`;
      const hasPortfolio =
        post.portfolio &&
        (() => {
          try {
            const u = new URL(post.portfolio);
            return u.protocol === 'http:' || u.protocol === 'https:';
          } catch {
            return false;
          }
        })();
      const portfolioRedirectUrl = hasPortfolio
        ? `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}?target=portfolio`
        : null;

      // 1️⃣ Viewcount +1 (legacy callback posts)
      const newViewCount = await this.jobPostsService.incrementViewCount(
        postId,
      );

      // 3️⃣ Keyboardni URL tugma bilan yangilash
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            {
              text: `👁 Ko'rildi: ${newViewCount}`,
              callback_data: `views_${redirectKey}`,
            },
          ],
          [
            { text: '📞 Aloqaga chiqish', url: redirectUrl },
            ...(portfolioRedirectUrl
              ? [{ text: '🗂 Portfolio', url: portfolioRedirectUrl }]
              : []),
          ],
        ],
      });

      // 4️⃣ Oddiy popupni yopish
      await ctx.answerCbQuery();
    } catch (err) {
      console.error('BOT ACTION ERROR:', err);
      try {
        await ctx.answerCbQuery('Xatolik yuz berdi', { show_alert: true });
      } catch {}
    }
  }

  @Action(/views_(.+)/)
  async handleViewCountClick(ctx) {
    try {
      const postId = ctx.match[1];
      const post: any = await this.jobPostsService.findByPostId(postId);
      if (!post) {
        await ctx.answerCbQuery('Post topilmadi', { show_alert: true });
        return;
      }

      const redirectKey = (post as any).post_id || (post as any).id || postId;

      const redirectHost =
        config.PROD_HOST || config.HOST_URL || 'https://t.me/Reztalpost';
      const safeRedirectHost = redirectHost.startsWith('http://')
        ? redirectHost.replace('http://', 'https://')
        : redirectHost.startsWith('https://')
          ? redirectHost
          : `https://${redirectHost}`;
      const redirectUrl = `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}`;
      const hasPortfolio =
        post.portfolio &&
        (() => {
          try {
            const u = new URL(post.portfolio);
            return u.protocol === 'http:' || u.protocol === 'https:';
          } catch {
            return false;
          }
        })();
      const portfolioRedirectUrl = hasPortfolio
        ? `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}?target=portfolio`
        : null;
      const currentViewCount = post.view_count || 0;

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            {
              text: `👁 Ko'rildi: ${currentViewCount}`,
              callback_data: `views_${redirectKey}`,
            },
          ],
          [
            { text: '📞 Aloqaga chiqish', url: redirectUrl },
            ...(portfolioRedirectUrl
              ? [{ text: '🗂 Portfolio', url: portfolioRedirectUrl }]
              : []),
          ],
        ],
      });

      await ctx.answerCbQuery();
    } catch (err) {
      console.error('BOT VIEW ACTION ERROR:', err);
      try {
        await ctx.answerCbQuery('Xatolik yuz berdi', { show_alert: true });
      } catch {}
    }
  }

  @Action('noop')
  async noop() {}

  // ===== ASOSIY MENYU =====
  private async showMainMenu(@Ctx() ctx: Context, lang: Language) {
    const dto = { telegram_id: String(ctx.chat?.id) };
    try {
      const user = await this.userService.getAdmin(dto);

      if (ctx.chat?.type === 'private') {
        if (user.statusCode && `${user.statusCode}`.startsWith('2')) {
          await ctx.reply(this.t(lang, 'admin_panel'), {
            reply_markup: {
              keyboard: [
                [this.t(lang, 'pending_posts')],
                [this.t(lang, 'statistics'), this.t(lang, 'admins')],
                [this.t(lang, 'add_admin')],
                [this.t(lang, 'back_to_main')],
              ],
              resize_keyboard: true,
            },
          });
        } else {
          await ctx.reply(this.t(lang, 'welcome'), {
            reply_markup: {
              keyboard: [
                [
                  this.t(lang, 'rezume'),
                  this.t(lang, 'vacancy'),
                  this.t(lang, 'announcement'),
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        }
      } else {
        ctx.reply(
          this.t(lang, 'group_info'),
        );
      }
    } catch (error) {
      if (ctx.chat?.type === 'private') {
        await ctx.reply(this.t(lang, 'welcome'), {
          reply_markup: {
            keyboard: [
              [
                this.t(lang, 'rezume'),
                this.t(lang, 'vacancy'),
                this.t(lang, 'announcement'),
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else {
        ctx.reply(
          this.t(lang, 'group_info'),
        );
      }
    }
  }

  @Action('paginate_next')
  async paginateNext(@Ctx() ctx: BotContext) {
    // ✅ Callback query'ni darhol javoblash
    await ctx.answerCbQuery();

    const baseFilters =
      ctx.session.filter || ctx.session.lastFilters || undefined;
    if (!baseFilters) return;

    const userLang = this.userLanguageService.getUserLanguage(
      ctx.from!.id.toString(),
    );

    const currentPage = Number(baseFilters.page) || 1;
    const nextFilters = { ...baseFilters, page: currentPage + 1 };
    ctx.session.filter = nextFilters;
    ctx.session.lastFilters = nextFilters;

    // ✅ Yangi natijalarni ko'rsatish
    const searchType =
      ctx.session.searchMode === 'resume'
        ? Post_Type.RESUME
        : Post_Type.VACANCY;
    await this.botSerchWorkService.showResults(
      ctx,
      userLang,
      searchType,
      nextFilters,
    );
  }

  @Action('paginate_prev')
  async paginatePrev(@Ctx() ctx: BotContext) {
    // ✅ Callback query'ni darhol javoblash
    await ctx.answerCbQuery();

    const baseFilters =
      ctx.session.filter || ctx.session.lastFilters || undefined;
    if (!baseFilters) return;

    const userLang = this.userLanguageService.getUserLanguage(
      ctx.from!.id.toString(),
    );

    const currentPage = Number(baseFilters.page) || 1;
    if (currentPage <= 1) {
      await ctx.answerCbQuery('Bu birinchi sahifa');
      return;
    }

    const prevFilters = { ...baseFilters, page: currentPage - 1 };
    ctx.session.filter = prevFilters;
    ctx.session.lastFilters = prevFilters;

    // ✅ Yangi natijalarni ko'rsatish
    const searchType =
      ctx.session.searchMode === 'resume'
        ? Post_Type.RESUME
        : Post_Type.VACANCY;
    await this.botSerchWorkService.showResults(
      ctx,
      userLang,
      searchType,
      prevFilters,
    );
  }

  @Action('view_count')
  async viewCountNoop(@Ctx() ctx: BotContext) {
    // Just acknowledge to avoid spinner; no action needed
    await ctx.answerCbQuery();
  }

  @Action('mypost_next')
  async myPostNext(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    if (!ctx.session.myPosts) return;

    const userLang = this.userLanguageService.getUserLanguage(
      ctx.from!.id.toString(),
    );

    const { page, totalPages } = ctx.session.myPosts;
    if (page >= totalPages) {
      await ctx.answerCbQuery('Bu oxirgi sahifa');
      return;
    }

    ctx.session.myPosts.page += 1;
    await this.showMyPost(ctx, userLang, true);
  }

  @Action('mypost_prev')
  async myPostPrev(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    if (!ctx.session.myPosts) return;

    const userLang = this.userLanguageService.getUserLanguage(
      ctx.from!.id.toString(),
    );

    const { page } = ctx.session.myPosts;
    if (page <= 1) {
      await ctx.answerCbQuery('Bu birinchi sahifa');
      return;
    }

    ctx.session.myPosts.page -= 1;
    await this.showMyPost(ctx, userLang, true);
  }

  @Action(/mypost_delete_(.*)/)
  async requestDeleteMyPost(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    const postId = (ctx as any).match?.[1];
    if (!postId) return;

    const userLang = this.userLanguageService.getUserLanguage(
      ctx.from!.id.toString(),
    );

    const post: any = await this.jobPostsService.findByPostId(postId);
    if (!post) {
      await ctx.reply(this.t(userLang, 'not_provided'));
      return;
    }

    if (post.post_status === Post_Status.DELETED) {
      await ctx.reply('❌ Bu post allaqachon o\'chirilgan.');
      return;
    }

    console.log('[DELETE REQUEST] user', ctx.from?.id, 'postId', postId, 'post', {
      id: post.id,
      post_id: post.post_id,
      type: post.type,
      status: post.post_status,
    });

    const caption = `🗑 O'chirish so'rovi\n\nID: ${post.post_id || post.id}\nType: ${post.type}\nUser: ${ctx.from?.username || ctx.from?.id}`;
    const adminKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ O\'chirish',
            callback_data: `admindel_confirm_${post.id || post.post_id}`,
          },
        ],
      ],
    };

    await ctx.telegram.sendMessage(config.TELEGRAM_GROUP_ID, caption, {
      reply_markup: adminKeyboard,
    });

    await ctx.reply('✅ O\'chirish so\'rovi yuborildi');
  }

  @Action(/admindel_confirm_(.*)/)
  async confirmDelete(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    const postId = (ctx as any).match?.[1];
    if (!postId) return;

    try {
      console.log('[DELETE CONFIRM] admin', ctx.from?.id, 'postId', postId);
      const result = await this.jobPostsService.softDeletePost(postId);
      if (!result) {
        await ctx.editMessageText(`❌ Post topilmadi (ID: ${postId})`);
        return;
      }
      const contact = result.user?.phone_number || result.telegram_username || postId;
      await ctx.editMessageText(`✅ Post o'chirildi. Aloqa: ${contact}`);

      // Notify owner if possible
      if (result.user?.telegram_id) {
        try {
          await ctx.telegram.sendMessage(
            result.user.telegram_id,
            '✅ Post o\'chirildi.',
          );
        } catch (notifyErr) {
          console.log('Failed to notify user about deletion', notifyErr);
        }
      }
    } catch (err) {
      console.log('[DELETE CONFIRM ERROR]', err);
      await ctx.editMessageText(`❌ O'chirishda xato: ${err.message || err}`);
    }
  }

  @Action(/admindel_cancel_(.*)/)
  async cancelDelete(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('🚫 O\'chirish bekor qilindi');
  }

  // ===== MESSAGE HANDLER =====
  @On('message')
  async onMessage(@Ctx() ctx: BotContext) {
    const userId = ctx.from!.id.toString();
    const chatId = ctx.chat!.id.toString();

    const msg = ctx.message;
    if (!msg) return;

    // User tilini olish
    const userLang = this.userLanguageService.getUserLanguage(userId);

    // Agar til tanlanmagan bo'lsa
    if (!this.userLanguageService.hasLanguage(userId)) {
      if ('text' in msg && msg.text && msg.text === '/start') {
        await this.start(ctx);
        return;
      }

      await ctx.reply(
        '🇺🇿🇷🇺🇺🇸 ' +
          this.t(Language.UZ, 'choose_language') +
          '\n' +
          this.t(Language.RU, 'choose_language') +
          '\n' +
          this.t(Language.EN, 'choose_language'),
        {
          reply_markup: this.i18nService.getKeyboard(
            Language.UZ,
            'language_selector',
          ),
        },
      );
      return;
    }

    // ===== ASOSIY MENYU TANLOVLARI =====
    if ('text' in msg && msg.text) {
      if (msg.text === '/start') {
        await this.start(ctx);
        return;
      }

      // Tilni o'zgartirish
      if (
        msg.text === '/language' ||
        msg.text === this.t(userLang, 'change_language')
      ) {
        await ctx.reply(
          '🇺🇿🇷🇺🇺🇸 ' +
            this.t(Language.UZ, 'choose_language') +
            '\n' +
            this.t(Language.RU, 'choose_language') +
            '\n' +
            this.t(Language.EN, 'choose_language'),
          {
            reply_markup: this.i18nService.getKeyboard(
              Language.UZ,
              'language_selector',
            ),
          },
        );
        return;
      }

      // Asosiy menyudagi tanlovlar
      if (msg.text === this.t(userLang, 'rezume')) {
        // Rezume submenuni ko'rsatish
        await ctx.reply(this.t(userLang, 'choose_rezume_option'), {
          reply_markup: this.getRezumeSubmenuKeyboard(userLang),
        });
        return;
      }

      if (msg.text === this.t(userLang, 'vacancy')) {
        // Vacancy submenuni ko'rsatish
        await ctx.reply(this.t(userLang, 'choose_vacancy_option'), {
          reply_markup: this.getVacancySubmenuKeyboard(userLang),
        });
        return;
      }

      if (msg.text === this.t(userLang, 'announcement')) {
        const myPostsRes = await this.jobPostsService.getMyPosts({
          telegram_id: chatId,
        });

        const posts = myPostsRes?.data || [];

        if (!posts.length) {
          await ctx.reply(this.t(userLang, 'not_provided'), {
            reply_markup: this.getBackToMainKeyboard(userLang),
          });
          return;
        }

        ctx.session.myPosts = {
          items: posts,
          page: 1,
          totalPages: Math.ceil(posts.length / 1),
        };

        await this.showMyPost(ctx, userLang);
        return;
      }

      // Rezume submenu tanlovlari
      if (msg.text === this.t(userLang, 'fill_rezume')) {
        const firstQuestion = await this.botRezumeService.startCollection(
          chatId,
          userLang,
        );
        await ctx.reply(firstQuestion, {
          reply_markup: { remove_keyboard: true },
        });
        setTimeout(async () => {
          await ctx.reply(this.t(userLang, 'prompts.select_category'), {
            reply_markup: this.i18nService.getCategoryKeyboard(userLang),
          });
        }, 0);
        return;
      }

      if (msg.text === this.t(userLang, 'fill_vacancy')) {
        const firstQuestion =
          await this.botVacancyService.startEmployerCollection(
            chatId,
            userLang,
          );
        await ctx.reply(firstQuestion, {
          reply_markup: { remove_keyboard: true },
        });
        setTimeout(async () => {
          await ctx.reply(this.t(userLang, 'prompts.select_category'), {
            reply_markup: this.i18nService.getCategoryKeyboard(userLang),
          });
        }, 0);
        return;
      }

      // 1. AVVAL "search_job" tugmasi bosilganda
      if (msg.text === this.t(userLang, 'search_again')) {
        await this.clearLastResultMessage(ctx);
        const currentMode =
          ctx.session?.searchMode === 'resume' ? 'resume' : 'vacancy';
        this.resetSearchState(ctx, userLang, currentMode);

        await ctx.reply(this.t(userLang, 'prompts.select_category'), {
          reply_markup: this.i18nService.getCategoryKeyboard(userLang),
        });

        ctx.session.step = 1;
        return;
      }

      if (msg.text === this.t(userLang, 'search_job')) {
        await this.clearLastResultMessage(ctx);
        this.resetSearchState(ctx, userLang, 'vacancy');

        await ctx.reply(this.t(userLang, 'prompts.select_category'), {
          reply_markup: this.i18nService.getCategoryKeyboard(userLang),
        });

        ctx.session.step = 1;
        return;
      }

      if (msg.text === this.t(userLang, 'search_employee')) {
        await this.clearLastResultMessage(ctx);
        this.resetSearchState(ctx, userLang, 'resume');

        await ctx.reply(this.t(userLang, 'prompts.select_category'), {
          reply_markup: this.i18nService.getCategoryKeyboard(userLang),
        });

        ctx.session.step = 1;
        return;
      }

      // 2. AGAR SESSIONDA STEP BOR BO'LSA (ya'ni search jarayonida bo'lsa)
      if (
        ctx.session &&
        ctx.session.step !== undefined &&
        ctx.session.step > 0
      ) {
        console.log(
          '[SEARCH FLOW]',
          JSON.stringify({
            chatId,
            step: ctx.session.step,
            searchMode: ctx.session.searchMode,
            text: msg.text,
            filter: ctx.session.filter,
          }),
        );

        if (msg.text === this.t(userLang, 'back_to_main')) {
          await this.clearLastResultMessage(ctx);
          this.resetSearchState(ctx, userLang);
          await this.showMainMenu(ctx, userLang);
          return;
        }

        const step = ctx.session.step;
        (ctx as any).lang = userLang;
        const text = msg.text.trim();
        const translation = this.i18nService.getTranslation(userLang);
        const isResumeSearch = ctx.session.searchMode === 'resume';

        // === RESUME (SEARCH EMPLOYEE) FLOW ===
        if (isResumeSearch) {
          // Step 1: category
          if (step === 1) {
            const categories = translation.category?.categories || [];
            const category = categories.find((cat: any) => cat.name === text);

            if (category) {
              ctx.session.category = category.name;
              ctx.session.step = 2;
              await ctx.reply(
                this.t(userLang, 'prompts.select_subcategory', {
                  category: category.name,
                }),
                {
                  reply_markup: this.i18nService.getSubCategoryKeyboard(
                    userLang,
                    category.name,
                  ),
                },
              );
              return;
            }

            await ctx.reply(this.t(userLang, 'errors_common.invalid_category'), {
              reply_markup: this.i18nService.getCategoryKeyboard(userLang),
            });
            return;
          }

          // Step 2: subcategory
          if (step === 2) {
            if (!ctx.session.category) {
              ctx.session.step = 0;
              await ctx.reply(this.t(userLang, 'errors_common.category_not_found'));
              return;
            }

            if (text === translation.category?.back) {
              ctx.session.category = null;
              ctx.session.step = 1;
              await ctx.reply(this.t(userLang, 'prompts.select_category'), {
                reply_markup: this.i18nService.getCategoryKeyboard(userLang),
              });
              return;
            }

            const categories = translation.category?.categories || [];
            const category = categories.find(
              (cat: any) => cat.name === ctx.session.category,
            );

            if (category && category.sub_categories) {
              const subcategories = category.sub_categories;
              const selectedSubcategory = subcategories.find(
                (sub: any) => sub === text,
              );

              if (selectedSubcategory) {
                ctx.session.filter.sub_category = selectedSubcategory;
                ctx.session.step = 3;
                await ctx.reply(
                  `✅ ${this.t(userLang, 'prompts.select_subcategory', {
                    category: ctx.session.category,
                  })} ${ctx.session.filter.sub_category}`,
                );
                await ctx.reply(this.t(userLang, 'prompts.select_region'), {
                  reply_markup: this.i18nService.getKeyboard(
                    userLang,
                    'regions',
                  ),
                });
                return;
              }
            }

            await ctx.reply(
              this.t(userLang, 'errors_common.invalid_subcategory'),
              {
                reply_markup: this.i18nService.getSubCategoryKeyboard(
                  userLang,
                  ctx.session.category,
                ),
              },
            );
            return;
          }

          // Step 3: region
          if (step === 3) {
            const regions = translation.regions;
            const exists = regions.flat().includes(text);
            if (exists) {
              ctx.session.filter.location = this.getRegionVariants(
                text,
                userLang,
              );
              ctx.session.step = 4;
              await ctx.reply(
                `${this.t(userLang, 'selected_label')}: ${text}`,
              );
              await this.botSerchWorkService.showResults(
                ctx,
                userLang,
                Post_Type.RESUME,
              );
              return;
            }

            await ctx.reply(this.t(userLang, 'errors_common.invalid_value'), {
              reply_markup: this.i18nService.getKeyboard(userLang, 'regions'),
            });
            return;
          }

          return;
        }

        // ================ STEP 1: KATEGORIYANI QABUL QILISH ================
        if (step === 1) {
          // Foydalanuvchi yuborgan kategoriyani tekshirish

          const categories = translation.category?.categories || [];

          const category = categories.find((cat: any) => cat.name === text);

          if (category) {
            // Kategoriyani sessionga saqlash
            ctx.session.category = category.name;

            // Subkategoriya keyboardini yuborish
            await ctx.reply(
              this.t(userLang, 'prompts.select_subcategory', {
                category: category.name,
              }),
              {
                reply_markup: this.i18nService.getSubCategoryKeyboard(
                  userLang,
                  category.name,
                ),
              },
            );

            // Stepni 2 ga o'zgartirish
            ctx.session.step = 2;
            return;
          } else {
            // Noto'g'ri kategoriya tanlangan
            await ctx.reply(
              this.t(userLang, 'errors_common.invalid_category'),
              {
                reply_markup: this.i18nService.getCategoryKeyboard(userLang),
              },
            );
            // STEP 1 da qolamiz
            return;
          }
        }

        // ================ STEP 2: SUBCATEGORY QABUL QILISH ================
        if (step === 2) {
          if (!ctx.session.category) {
            // Agar kategoriya yo'q bo'lsa, qayta boshlash
            ctx.session.step = 0;
            await ctx.reply(this.t(userLang, 'errors_common.category_not_found'));
            return;
          }

          const translation = this.i18nService.getTranslation(userLang);
          const categories = translation.category?.categories || [];

          // Orqaga tugmasi bosilganda kategoriyalarni qayta ko'rsatish
          if (msg.text.trim() === translation.category?.back) {
            console.log('[SEARCH FLOW] resume/vacancy back on subcategory');
            ctx.session.category = null;
            ctx.session.step = 1;
            await ctx.reply(this.t(userLang, 'prompts.select_category'), {
              reply_markup: this.i18nService.getCategoryKeyboard(userLang),
            });
            return;
          }

          const category = categories.find(
            (cat: any) => cat.name === ctx.session.category,
          );

          if (category && category.sub_categories) {
            const subcategories = category.sub_categories;

            const selectedSubcategory = subcategories.find(
              (sub: any) => sub === msg.text.trim(),
            );

            if (selectedSubcategory) {
              // Subkategoriyani sessionga saqlash
              ctx.session.filter.sub_category = selectedSubcategory;

              const levelRequiredCategories = [
                'dasturlash',
                'dizayn',
                'marketing',
                'программирование',
                'дизайн',
                'маркетинг',
                'programming',
                'design',
                'marketing',
              ];
              const normalizedCategory = (ctx.session.category || '').toLowerCase();
              if (isResumeSearch) {
                ctx.session.step = 3; // resume flow always asks work format next
              } else if (levelRequiredCategories.includes(normalizedCategory)) {
                ctx.session.step = 3;
              } else {
                ctx.session.step = 4;
              }
              // Keyingi filterga o'tish

              await ctx.reply(
                `✅ ${this.t(userLang, 'prompts.select_subcategory', {
                  category: ctx.session.category,
                })} ${ctx.session.filter.sub_category}`,
              );

              // Keyingi filterni so'rash

              if (isResumeSearch) {
                console.log(
                  '[SEARCH FLOW] resume -> ask work format',
                  ctx.session.filter,
                );
                await ctx.reply(this.t(userLang, 'prompts.select_work_type'), {
                  reply_markup: this.i18nService.getKeyboard(
                    userLang,
                    'work_types',
                  ),
                });
              } else {
                await this.botSerchWorkService.askNextField(ctx, userLang);
              }
              return;
            }
          }

          // Subkategoriya topilmasa, qayta so'rash
          await ctx.reply(
            this.t(userLang, 'errors_common.invalid_subcategory'),
            {
              reply_markup: this.i18nService.getSubCategoryKeyboard(
                userLang,
                ctx.session.category,
              ),
            },
          );
          return;
        }

        if (step === 3) {
          if (isResumeSearch) {
            // Resume: ish turi
            const mappedFormat = this.mapWorkFormat(text, userLang);
            if (mappedFormat) {
              ctx.session.filter.work_format = mappedFormat;
              if (mappedFormat === Work_Format.ONLINE) {
                ctx.session.filter.location = null;
              }
              ctx.session.step = 4;
              console.log(
                '[SEARCH FLOW] resume selected work_format',
                ctx.session.filter,
              );
              await ctx.reply(
                `${this.t(userLang, 'selected_label')}: ${text}`,
              );
              await ctx.reply(
                this.t(userLang, 'prompts.select_level', {
                  field: this.getFieldLabel(FILTER_FIELDS[2], userLang),
                }),
                {
                  reply_markup: this.i18nService.getKeyboard(userLang, 'level'),
                },
              );
            } else {
              await ctx.reply(this.t(userLang, 'errors_common.invalid_value'), {
                reply_markup: this.i18nService.getKeyboard(
                  userLang,
                  'work_types',
                ),
              });
            }
          } else {
            // Vacancy: level (faqat levelRequired)
            const mappedLevel = this.mapLevel(text, userLang);
            const displayLevel =
              (mappedLevel && translation.level?.[mappedLevel]) || text;
            if (mappedLevel) {
              ctx.session.filter.level = mappedLevel;
              ctx.session.step = 4;
              await ctx.reply(
                `${this.t(userLang, 'selected_label')}: ${displayLevel}`,
              );
              await this.botSerchWorkService.askNextField(ctx, userLang);
            } else {
              await ctx.reply(this.t(userLang, 'errors_common.invalid_value'), {
                reply_markup: this.i18nService.getKeyboard(userLang, 'level'),
              });
            }
          }
          return;
        }
        if (step === 4) {
          if (isResumeSearch) {
            // Resume: level
            const mappedLevel = this.mapLevel(text, userLang);
            const displayLevel =
              (mappedLevel && translation.level?.[mappedLevel]) || text;
            if (mappedLevel) {
              ctx.session.filter.level = mappedLevel;

              const workFormat = ctx.session.filter.work_format;
              if (workFormat === 'Online') {
                ctx.session.step = 6;
                ctx.session.filter.location = null;
                console.log(
                  '[SEARCH FLOW] resume level ok, online -> show results',
                  ctx.session.filter,
                );
                await ctx.reply(
                  `${this.t(userLang, 'selected_label')}: ${displayLevel}`,
                );
                await this.botSerchWorkService.showResults(
                  ctx,
                  userLang,
                  Post_Type.RESUME,
                );
              } else {
                ctx.session.step = 5;
                console.log(
                  '[SEARCH FLOW] resume level ok, ask region',
                  ctx.session.filter,
                );
                await ctx.reply(
                  `${this.t(userLang, 'selected_label')}: ${displayLevel}`,
                );
                await ctx.reply(this.t(userLang, 'prompts.select_region'), {
                  reply_markup: this.i18nService.getKeyboard(
                    userLang,
                    'regions',
                  ),
                });
              }
            } else {
              await ctx.reply(this.t(userLang, 'errors_common.invalid_value'), {
                reply_markup: this.i18nService.getKeyboard(userLang, 'level'),
              });
            }
          } else {
            // Vacancy: work format
            const mappedFormat = this.mapWorkFormat(text, userLang);
            if (mappedFormat) {
              ctx.session.filter.work_format = mappedFormat;
              if (mappedFormat === Work_Format.ONLINE) {
                ctx.session.step = 6;
                await ctx.reply(
                  `${this.t(userLang, 'selected_label')}: ${text}`,
                );
                await this.botSerchWorkService.showResults(
                  ctx,
                  userLang,
                  Post_Type.VACANCY,
                );
              } else {
                ctx.session.step = 5;
                await ctx.reply(
                  `${this.t(userLang, 'selected_label')}: ${text}`,
                );
                await this.botSerchWorkService.askNextField(ctx, userLang);
              }
            } else {
              await ctx.reply(this.t(userLang, 'errors_common.invalid_value'), {
                reply_markup: this.i18nService.getKeyboard(
                  userLang,
                  'work_types',
                ),
              });
            }
          }

          return;
        }
        if (step === 5) {
          const regions = translation.regions;
          const exists = regions.flat().includes(text) || this.isValidRegion(text, userLang);
          if (exists) {
            ctx.session.filter.location = this.getRegionVariants(
              text,
              userLang,
            );
            ctx.session.step = 6;
            await ctx.reply(
              `${this.t(userLang, 'selected_label')}: ${text}`,
            );
            if (isResumeSearch) {
              await this.botSerchWorkService.showResults(
                ctx,
                userLang,
                Post_Type.RESUME,
              );
            } else {
              await this.botSerchWorkService.askNextField(ctx, userLang);
            }
          } else {
            await ctx.reply(this.t(userLang, 'errors_common.invalid_value'));
            if (isResumeSearch) {
              await ctx.reply(this.t(userLang, 'prompts.select_region'), {
                reply_markup: this.i18nService.getKeyboard(
                  userLang,
                  'regions',
                ),
              });
            } else {
              await this.botSerchWorkService.askNextField(ctx, userLang);
            }
          }
        }
      }

      // Vacancy submenu tanlovlari
      if (msg.text === this.t(userLang, 'fill_vacancy')) {
        const firstQuestion =
          await this.botVacancyService.startEmployerCollection(
            chatId,
            userLang,
          );
        await ctx.reply(firstQuestion, {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      // Asosiy menyuga qaytish
      if (msg.text === this.t(userLang, 'back_to_main')) {
        await this.showMainMenu(ctx, userLang);
        return;
      }
    }

    // ===== STATE LARNI TEKSHIRISH VA YO'NALTIRISH =====
    const rezumeState = this.botRezumeService.getUserState(chatId);
    const vacancyState = this.botVacancyService.getEmployerState(chatId);

    if (rezumeState) {
      await this.handleRezumeFlow(ctx, msg, rezumeState, chatId, userLang);
      return;
    }

    if (vacancyState) {
      await this.handleVacancyFlow(ctx, msg, vacancyState, chatId, userLang);
      return;
    }
  }

  // ===== VAKANSIYA FLOW =====
  private async handleVacancyFlow(
    @Ctx() ctx: BotContext,
    msg: any,
    state: any,
    chatId: string,
    lang: Language,
  ) {
    // ===== CONFIRMATION MODE =====
    if (state.confirmationMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === this.t(lang, 'confirmation')) {
          // Maosh va telefon formatlash
          const formattedAnswers = { ...state.answers };
          if (formattedAnswers[7]) {
            formattedAnswers[7] = this.formatSalary(formattedAnswers[7]);
          }
          if (formattedAnswers[8]) {
            formattedAnswers[8] = this.formatPhone(formattedAnswers[8]);
          }
          if (formattedAnswers[9]) {
            formattedAnswers[9] = this.formatUsername(formattedAnswers[9]);
          }

          try {
            const userData = {
              name: state.answers[2],
              phone_number: state.answers[8],
              telegram_id: chatId,
            };

            const userCreateResponse =
              await this.userService.createHr(userData);

            if (!`${userCreateResponse.statusCode}`.startsWith('2')) {
              return 'Error on creating user';
            }

            const result =
              await this.botVacancyService.generateVacancyImage(
                formattedAnswers,
              );

            const selectedLevel: Level =
              this.mapLevel(state.answers[5], lang) || Level.SENIOR;

            const selectedFormat: Work_Format =
              this.mapWorkFormat(state.answers[3], lang) ||
              Work_Format.GIBRID;

            const vacancyData = {
              sub_category: String(state.answers[1]),
              level: selectedLevel,
              work_format: selectedFormat,
              skills: String(state.answers[6]),
              salary: String(state.answers[7]),
              address:
                selectedFormat === Work_Format.ONLINE
                  ? null
                  : String(state.answers[4]),
              telegram_username: String(state.answers[9]),
              image_path: result.imagePath,
              user_id: userCreateResponse.data.id,
            };

            const createVacancy =
              await this.jobPostsService.createVacancy(vacancyData);

            const post = await this.botAdminService.addPost({
              type: Post_Type.VACANCY,
              userId: chatId,
              userInfo: {
                username: ctx.from?.username || this.t(lang, 'unknown'),
                first_name: ctx.from?.first_name,
                last_name: ctx.from?.last_name,
                language: lang,
              },
              data: formattedAnswers,
              imagePath: result.imagePath,
              caption: result.caption,
              status: Post_Status.PENDING,
            });

            const notifyResult =
              await this.botAdminService.notifyAdminAboutNewPost(
                post,
                ctx.telegram,
              );

            const dto = {
              job_posts_id: createVacancy.data.id,
              message_id: notifyResult,
            };
            const postForGroup =
              await this.jobPostsTelegramService.createPostForGroup(dto);
            await ctx.replyWithPhoto(
              { source: result.imagePath },
              {
                caption: this.t(
                  lang,
                  'confirmation_messages.rezume_submitted',
                  {
                    postId: post.id,
                  },
                ),
                parse_mode: 'Markdown',
                reply_markup: { remove_keyboard: true },
              },
            );

            // State ni tozalash
            this.botVacancyService.deleteEmployerState(chatId);
            return;
          } catch (error) {
            return error;
          }
        }

        if (msg.text === this.t(lang, 'edit')) {
          state.confirmationMode = false;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }
      }
      return;
    }

    // ===== EDIT MODE =====
    if (state.editMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === this.t(lang, 'confirmation')) {
          state.editMode = false;
          state.confirmationMode = true;
          await this.showVacancyConfirmation(ctx, state.answers, lang);
          return;
        }

        const fieldMap = {
          [this.t(lang, 'edit_fields.vacancy').split(', ')[0]]: 1,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[1]]: 2,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[2]]: 3,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[3]]: 4,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[4]]: 5,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[5]]: 6,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[6]]: 7,
          [this.t(lang, 'edit_fields.vacancy').split(', ')[7]]: 8,
        };

        if (fieldMap[msg.text]) {
          state.editingField = fieldMap[msg.text];
          state.editMode = false;

          // ===== MAXSUS FIELD LAR UCHUN TO'GRIDAN-TO'G'RI KEYBOARD =====
          if (state.editingField === 3) {
            // Ish turi
            await ctx.reply(this.t(lang, 'vacancy_questions')[2], {
              reply_markup: this.botVacancyService.getKeyboard(
                lang,
                'work_types',
              ),
            });
            return;
          }

          if (state.editingField === 4) {
            // Hudud
            await ctx.reply(this.t(lang, 'vacancy_questions')[3], {
              reply_markup: this.botVacancyService.getKeyboard(lang, 'regions'),
            });
            return;
          }

          if (state.editingField === 5) {
            // Hudud
            await ctx.reply(this.t(lang, 'vacancy_questions')[4], {
              reply_markup: this.botVacancyService.getKeyboard(lang, 'level'),
            });
            return;
          }

          if (state.editingField === 9) {
            // Telefon
            await ctx.reply(this.t(lang, 'vacancy_questions')[8], {
              reply_markup: this.botVacancyService.getKeyboard(lang, 'phone'),
            });
            return;
          }

          // ===== ODDIY MATN FIELD LARI =====
          const questions = this.botVacancyService.getQuestions(lang);
          await ctx.reply(questions[state.editingField - 1], {
            reply_markup: { remove_keyboard: true },
          });
          return;
        }
      }
      return;
    }

    // ===== FIELD EDITING =====
    if (state.editingField) {
      const field = state.editingField;

      // Fieldga qarab maxsus ishlov
      if (field === 4) {
        // Hudud
        const text = 'text' in msg ? msg.text : '';
        const validRegions = this.botVacancyService
          .getKeyboard(lang, 'regions')
          .keyboard.flat();

        // Hududni tekshirish
        if (this.isValidRegion(text, lang)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }

        await ctx.reply(this.t(lang, 'errors.region_invalid'), {
          reply_markup: this.botVacancyService.getKeyboard(lang, 'regions'),
        });
        return;
      }

      if (field === 3) {
        // Ish turi
        const text = 'text' in msg ? msg.text : '';
        const validWorkTypes = this.botVacancyService
          .getKeyboard(lang, 'work_types')
          .keyboard.flat();

        if (this.isValidWorkType(text, lang)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }

        await ctx.reply(this.t(lang, 'errors.work_type_invalid'), {
          reply_markup: this.botVacancyService.getKeyboard(lang, 'work_types'),
        });
        return;
      }

      if (field === 9) {
        // Telefon
        let phone = '';

        if ('contact' in msg && msg.contact) {
          phone = msg.contact.phone_number;
        } else if ('text' in msg && msg.text) {
          phone = msg.text;
        }

        if (phone) {
          const validation = this.isValidPhone(phone, lang);
          if (!validation.isValid) {
            await ctx.reply(validation.message!, {
              reply_markup: this.botVacancyService.getKeyboard(lang, 'phone'),
            });
            return;
          }

          state.answers[field] = this.formatPhone(phone);
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }

        await ctx.reply(this.t(lang, 'errors.phone_invalid'), {
          reply_markup: this.botVacancyService.getKeyboard(lang, 'phone'),
        });
        return;
      }

      // ===== MAOSH FIELD =====
      if (field === 7) {
        if ('text' in msg && msg.text) {
          const validation = this.isValidSalary(msg.text, lang);
          if (!validation.isValid) {
            await ctx.reply(validation.message!);
            return;
          }

          state.answers[field] = msg.text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }
      }

      // ===== USERNAME FIELD =====
      if (field === 8) {
        if ('text' in msg && msg.text) {
          const username = msg.text.trim();

          if (!username.startsWith('@')) {
            await ctx.reply(this.t(lang, 'errors.username_invalid'));
            return;
          }

          if (username.length < 2) {
            await ctx.reply(this.t(lang, 'errors.username_invalid'));
            return;
          }

          state.answers[field] = username;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers, lang);
          return;
        }
      }

      // Oddiy matn fieldlari
      if ('text' in msg && field !== 7 && field !== 8) {
        state.answers[field] = msg.text;
        state.editingField = null;
        state.editMode = true;
        await this.showVacancyEditMenu(ctx, state.answers, lang);
        return;
      }

      return;
    }

    // ===== NORMAL FLOW - BARCHA QADAMLAR BotVacancyService ORQALI =====
    const result = await this.botVacancyService.handleEmployerAnswer(
      chatId,
      msg,
    );

    if (!result) return;

    if (result.confirmation) {
      state.confirmationMode = true;
      state.answers = result.answers;
      state.gender = result.gender;
      await this.showVacancyConfirmation(ctx, result.answers, lang);
      return;
    }

    if (result && typeof result === 'object' && result.message) {
      let message = this.t(lang, result.message);

      if (result.keyboard) {
        await ctx.reply(message, {
          reply_markup: result.keyboard,
        });
      } else {
        await ctx.reply(message, {
          reply_markup: { remove_keyboard: true },
        });
      }
      return;
    }

    // if (typeof result === 'string') {
    //   // ===== MAXSUS SIGNALLAR =====
    //   if (result === 'step4') {
    //     await ctx.reply(this.t(lang, 'vacancy_questions')[3], {
    //       reply_markup: this.botVacancyService.getKeyboard(lang, 'regions'),
    //     });
    //     return;
    //   }

    //   if (result === 'step3') {
    //     await ctx.reply(this.t(lang, 'vacancy_questions')[2], {
    //       reply_markup: this.botVacancyService.getKeyboard(lang, 'work_types'),
    //     });
    //     return;
    //   }

    //   if (result === 'step5') {
    //     await ctx.reply(this.t(lang, 'vacancy_questions')[4], {
    //       reply_markup: this.botVacancyService.getKeyboard(lang, 'level'),
    //     });
    //     return;
    //   }

    //   await ctx.reply(this.t(lang, result), {
    //     reply_markup: { remove_keyboard: true },
    //   });
    //   return;
    // } else if (result.message) {
    //   await ctx.reply(result.message, {
    //     reply_markup: result.keyboard || { remove_keyboard: true },
    //   });
    //   return;
    // } else if (result.confirmation) {
    //   state.confirmationMode = true;
    //   state.answers = result.answers;
    //   await this.showVacancyConfirmation(ctx, result.answers, lang);
    //   return;
    // }
  }

  // ===== ISH KERAK FLOW =====
  private async handleRezumeFlow(
    @Ctx() ctx: BotContext,
    msg: any,
    state: any,
    chatId: string,
    lang: Language,
  ) {
    // ===== CONFIRMATION MODE =====
    if (state.confirmationMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === this.t(lang, 'confirmation')) {
          const formattedAnswers = { ...state.answers };
          if (formattedAnswers[4]) {
            formattedAnswers[4] = this.formatSalary(formattedAnswers[4]);
          }
          if (formattedAnswers[12]) {
            formattedAnswers[12] = this.formatPhone(formattedAnswers[12]);
          }
          if (formattedAnswers[13]) {
            formattedAnswers[13] = this.formatUsername(formattedAnswers[13]);
          }

          try {
            const userData = {
              name: state.answers[5],
              phone_number: state.answers[12],
              telegram_id: chatId,
            };

            const userCreateResponse =
              await this.userService.createCandidate(userData);

            if (!`${userCreateResponse.statusCode}`.startsWith('2')) {
              return 'Error on creating user';
            }

            const result = await this.botRezumeService.generateImage(
              formattedAnswers,
              state.gender,
            );

            const resumeData = {
              sub_category: String(state.answers[1]),
              experience: String(state.answers[3]),
              skills: String(state.answers[11]),
              salary: String(state.answers[4]),
              age: String(state.answers[6]),
              address: String(state.answers[8]),
              language: String(state.answers[9]),
              portfolio: String(state.answers[10]),
              telegram_username: String(state.answers[13]),
              user_id: userCreateResponse.data.id,
              image_path: result.imagePath,
            };

            const createResume =
              await this.jobPostsService.createResume(resumeData);

            const post = await this.botAdminService.addPost({
              type: Post_Type.RESUME,
              userId: chatId,
              userInfo: {
                username: ctx.from?.username || this.t(lang, 'unknown'),
                first_name: ctx.from?.first_name,
                last_name: ctx.from?.last_name,
                language: lang,
              },
              data: formattedAnswers,
              imagePath: result.imagePath,
              caption: result.caption,
              status: Post_Status.PENDING,
            });

            const notifyResult =
              await this.botAdminService.notifyAdminAboutNewPost(
                post,
                ctx.telegram,
              );

            const dto = {
              job_posts_id: createResume.data.id,
              message_id: notifyResult,
            };
            await this.jobPostsTelegramService.createPostForGroup(dto);

            await ctx.replyWithPhoto(
              { source: result.imagePath },
              {
                caption: this.t(
                  lang,
                  'confirmation_messages.rezume_submitted',
                  {
                    postId: post.id,
                  },
                ),
                parse_mode: 'Markdown',
                reply_markup: { remove_keyboard: true },
              },
            );

            await this.sendBackToMainShortcut(ctx, lang);

            this.botRezumeService.deleteUserState(chatId);
            return;
          } catch (error) {
            return error;
          }
        }

        if (msg.text === this.t(lang, 'edit')) {
          state.confirmationMode = false;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }
      }
      return;
    }

    // ===== EDIT MODE =====
    if (state.editMode) {
      if ('text' in msg && msg.text) {
        const rezumeConfirmationButton = `${this.t(lang, 'confirmation')}`;
        if (msg.text.includes(rezumeConfirmationButton)) {
          state.editMode = false;
          state.confirmationMode = true;
          await this.showRezumeConfirmation(
            ctx,
            state.answers,
            state.gender,
            lang,
          );
          return;
        }

        const fieldMap = {
          1: 1,
          2: 3,
          3: 4,
          4: 5,
          5: 6,
          6: 7,
          7: 8,
          8: 9,
          9: 10,
          10: 11,
          11: 12,
          12: 13,
        };

        const match = msg.text.match(/^(\d+)[\.:]?\s*(.*)$/);

        const index = parseInt(match[1], 10);
        const textPart = match[2].trim();

        if (fieldMap[index]) {
          state.editingField = fieldMap[index];
          state.editMode = false;

          if (state.editingField === 1) {
            await ctx.reply(
              this.t(lang, 'prompts.select_category'),
              {
                reply_markup: this.i18nService.getCategoryKeyboard(lang),
              },
            );
            return;
          }

          if (state.editingField === 7) {
            await ctx.reply(this.t(lang, 'rezume_questions')[6], {
              reply_markup: this.botRezumeService.getKeyboard(lang, 'gender'),
            });
            return;
          }

          if (state.editingField === 8) {
            await ctx.reply(this.t(lang, 'rezume_questions')[7], {
              reply_markup: this.botRezumeService.getKeyboard(lang, 'regions'),
            });
            return;
          }

          if (state.editingField === 9) {
            await ctx.reply(this.t(lang, 'rezume_questions')[8], {
              reply_markup: this.botRezumeService.getKeyboard(
                lang,
                'languages',
              ),
            });
            return;
          }

          if (state.editingField === 12) {
            await ctx.reply(this.t(lang, 'rezume_questions')[11], {
              reply_markup: this.botRezumeService.getKeyboard(lang, 'phone'),
            });
            return;
          }

          const questions = this.botRezumeService.getQuestions(lang);
          await ctx.reply(questions[state.editingField - 1], {
            reply_markup: { remove_keyboard: true },
          });
          return;
        }
      }
      return;
    }

    // ===== FIELD EDITING =====
    if (state.editingField) {
      const field = state.editingField;
      if (field === 1) {
        if ('text' in msg && msg.text) {
          const text = msg.text.trim();
          const translation = this.i18nService.getTranslation(lang);
          const categories = translation.category?.categories || [];

          // === 1. ORQAGA TUGMASI ===
          if (text === translation.category?.back) {
            if (state.selectedCategory) {
              delete state.selectedCategory;
              await ctx.reply(this.t(lang, 'prompts.select_category'), {
                reply_markup: this.i18nService.getCategoryKeyboard(lang),
              });
              return;
            }
          }

          // === 2. KATEGORIYA TANLASH ===
          const category = categories.find((cat: any) => cat.name === text);

          if (category && !state.selectedCategory) {
            state.selectedCategory = category.name;

            await ctx.reply(
              this.t(lang, 'prompts.select_subcategory', {
                category: category.name,
              }),
              {
                reply_markup: this.i18nService.getSubCategoryKeyboard(
                  lang,
                  category.name,
                ),
              },
            );
            return;
          }

          // === 3. SUBKATEGORIYA TANLASH ===
          if (state.selectedCategory) {
            const currentCategory = categories.find(
              (cat: any) => cat.name === state.selectedCategory,
            );

            // Subkategoriya tekshirish
            if (
              currentCategory &&
              currentCategory.sub_categories &&
              currentCategory.sub_categories.includes(text)
            ) {
              // Subkategoriyani saqlash
              state.answers[1] = text;
              state.answers.category = state.selectedCategory;

              // Holatlarni tozalash
              delete state.selectedCategory;
              state.editingField = null;
              state.editMode = true;

              // Edit menyusiga qaytish
              await this.showRezumeEditMenu(ctx, state.answers, lang);
              return;
            }

            // Noto'g'ri subkategoriya kiritilganda
            await ctx.reply(
              this.t(lang, 'prompts.select_subcategory', {
                category: state.selectedCategory,
              }),
              {
                reply_markup: this.i18nService.getSubCategoryKeyboard(
                  lang,
                  state.selectedCategory,
                ),
              },
            );
            return;
          }

          // === 4. DEFAULT: KATEGORIYA TANLASH ===
          await ctx.reply(
            this.t(lang, 'prompts.select_category'),
            {
              reply_markup: this.i18nService.getCategoryKeyboard(lang),
            },
          );
          return;
        }
        return;
      }

      if (field === 7) {
        const text = 'text' in msg ? msg.text : '';
        const genderOptions = this.botRezumeService.getKeyboard(lang, 'gender')
          .keyboard[0];

        if (genderOptions.includes(text)) {
          state.answers[field] = text;
          state.gender =
            text === this.t(lang, 'gender.female') ? 'female' : 'male';
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }
        await ctx.reply(this.t(lang, 'errors.gender_invalid'), {
          reply_markup: this.botRezumeService.getKeyboard(lang, 'gender'),
        });
        return;
      }

      if (field === 8) {
        const text = 'text' in msg ? msg.text : '';
        const validRegions = this.botRezumeService
          .getKeyboard(lang, 'regions')
          .keyboard.flat();

        if (this.isValidRegion(text, lang)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }

        await ctx.reply(this.t(lang, 'errors.region_invalid'), {
          reply_markup: this.botRezumeService.getKeyboard(lang, 'regions'),
        });
        return;
      }

      if (field === 9) {
        const text = 'text' in msg ? msg.text : '';

        if (!Array.isArray(state.answers[9])) state.answers[9] = [];

        if (text === this.t(lang, 'languages.4')) {
          // "Boshqa"/"Other"
          state.awaitingLanguageText = true;
          await ctx.reply(this.t(lang, 'enter_new_value'));
          return;
        }

        if (state.awaitingLanguageText && text) {
          state.answers[9].push(text);
          state.awaitingLanguageText = false;

          await ctx.reply(this.t(lang, 'add_another'), {
            reply_markup: this.botRezumeService.getKeyboard(lang, 'languages'),
          });
          return;
        }

        if (text === this.t(lang, 'languages.5')) {
          // "Tanlashni yakunlash"
          if (state.answers[9].length === 0) {
            await ctx.reply(this.t(lang, 'errors.language_invalid'), {
              reply_markup: this.botRezumeService.getKeyboard(
                lang,
                'languages',
              ),
            });
            return;
          }

          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }

        if (
          text &&
          this.botRezumeService
            .getKeyboard(lang, 'languages')
            .keyboard.flat()
            .includes(text)
        ) {
          if (state.answers[9].includes(text)) {
            state.answers[9] = state.answers[9].filter(
              (i: string) => i !== text,
            );
            await ctx.reply(this.t(lang, 'edit_prompt'), {
              reply_markup: this.botRezumeService.getKeyboard(
                lang,
                'languages',
              ),
            });
          } else {
            state.answers[9].push(text);
            await ctx.reply(this.t(lang, 'select_from_list'), {
              reply_markup: this.botRezumeService.getKeyboard(
                lang,
                'languages',
              ),
            });
          }
          return;
        }

        await ctx.reply(this.t(lang, 'errors.language_invalid'), {
          reply_markup: this.botRezumeService.getKeyboard(lang, 'languages'),
        });
        return;
      }

      if (field === 12) {
        let phone = '';

        if ('contact' in msg && msg.contact) {
          phone = msg.contact.phone_number;
        } else if ('text' in msg && msg.text) {
          phone = msg.text;
        }

        if (phone) {
          const validation = this.isValidPhone(phone, lang);
          if (!validation.isValid) {
            await ctx.reply(validation.message!, {
              reply_markup: this.botRezumeService.getKeyboard(lang, 'phone'),
            });
            return;
          }

          state.answers[field] = this.formatPhone(phone);
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }

        await ctx.reply(this.t(lang, 'errors.phone_invalid'), {
          reply_markup: this.botRezumeService.getKeyboard(lang, 'phone'),
        });
        return;
      }

      if (field === 4) {
        if ('text' in msg && msg.text) {
          const validation = this.isValidSalary(msg.text, lang);
          if (!validation.isValid) {
            await ctx.reply(validation.message!);
            return;
          }

          state.answers[field] = msg.text;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }
      }

      if (field === 13) {
        if ('text' in msg && msg.text) {
          const username = msg.text.trim();

          if (!username.startsWith('@')) {
            await ctx.reply(this.t(lang, 'errors.username_invalid'));
            return;
          }

          if (username.length < 2) {
            await ctx.reply(this.t(lang, 'errors.username_invalid'));
            return;
          }

          state.answers[field] = username;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers, lang);
          return;
        }
      }

      if ('text' in msg && field !== 4 && field !== 13) {
        state.answers[field] = msg.text;
        state.editingField = null;
        state.editMode = true;
        await this.showRezumeEditMenu(ctx, state.answers, lang);
        return;
      }

      return;
    }

    // ===== NORMAL FLOW =====
    const result = (await this.botRezumeService.handleUserAnswer(
      chatId,
      msg,
      ctx,
    )) as ServiceResponse;

    if (!result) return;

    // Confirmation holati
    if (result.confirmation) {
      state.confirmationMode = true;
      state.answers = result.answers;
      state.gender = result.gender;
      await this.showRezumeConfirmation(
        ctx,
        result.answers,
        result.gender,
        lang,
      );
      return;
    }

    // Object formatida javob (message va keyboard bilan)
    if (result && typeof result === 'object' && result.message) {
      let message = this.t(lang, result.message);

      if (result.keyboard) {
        await ctx.reply(message, {
          reply_markup: result.keyboard,
        });
      } else {
        await ctx.reply(message, {
          reply_markup: { remove_keyboard: true },
        });
      }
      return;
    }

    // String formatida javob
    if (typeof result === 'string') {
      // ===== TELEFON QADAMINI TEKSHIRISH =====
      if (result === 'step12') {
        await ctx.reply(this.t(lang, 'rezume_questions')[11], {
          reply_markup: this.botRezumeService.getKeyboard(lang, 'phone'),
        });
        return;
      }

      await ctx.reply(this.t(lang, result), {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }
  }

  private async showMyPost(
    @Ctx() ctx: BotContext,
    lang: Language,
    isCallback = false,
  ) {
    const myPosts = ctx.session.myPosts;
    if (!myPosts || !myPosts.items?.length) {
      await ctx.reply(this.t(lang, 'not_provided'));
      return;
    }

    const { page, items, totalPages } = myPosts;
    const idx = page - 1;
    if (idx < 0 || idx >= items.length) {
      await ctx.reply(this.t(lang, 'not_provided'));
      return;
    }

    let post: any = items[idx];

    // Refresh current post status; skip DELETED ones
    const refreshed = await this.jobPostsService.findByPostId(
      post.post_id || post.id,
    );
    if (!refreshed || refreshed.post_status === Post_Status.DELETED) {
      items.splice(idx, 1);
      const totalPagesUpdated = Math.max(1, Math.ceil(items.length / 1));
      const pageUpdated = Math.min(page, totalPagesUpdated);
      const idxUpdated = pageUpdated - 1;

      ctx.session.myPosts = {
        items,
        page: pageUpdated,
        totalPages: totalPagesUpdated,
      };

      if (!items.length) {
        await ctx.reply(this.t(lang, 'not_provided'));
        return;
      }

      let currentPage = pageUpdated;
      post = items[idxUpdated];
      ctx.session.myPosts.page = currentPage;
      ctx.session.myPosts.totalPages = totalPagesUpdated;
    }
    const caption = this.formatMyPostCaption(post, lang);
    const { photo, used } = this.resolvePhotoSource(post.image_path);
    const keyboard = this.getMyPostsKeyboard(page, totalPages, post);

    try {
      if (isCallback && ctx.callbackQuery?.message) {
        try {
          await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        } catch {}
      }

      await ctx.replyWithPhoto(photo, {
        caption,
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (err) {
      console.log('MyPosts photo send failed, using placeholder', err?.message);
      await ctx.replyWithPhoto('https://via.placeholder.com/400x200?text=No+Image', {
        caption,
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  // ===== CONFirmation KO'RSATISH =====
  private async showRezumeConfirmation(
    ctx: Context,
    answers: any,
    gender: string,
    lang: Language,
  ) {
    // Formatlangan ma'lumotlarni ko'rsatish
    const formattedSalary = this.formatSalary(answers[4] || '');
    const formattedPhone = this.formatPhone(answers[12] || '');
    const formattedUsername = this.formatUsername(answers[13] || '');

    const preview = this.t(lang, 'confirmation_messages.rezume_preview', {
      job: answers[1] || '...',
      experience: answers[3] || '...',
      salary: formattedSalary || '...',
      name: answers[5] || '...',
      age: answers[6] || '...',
      gender: answers[7] || '...',
      region: answers[8] || '...',
      languages: Array.isArray(answers[9])
        ? answers[9].join(', ')
        : answers[9] || '...',
      portfolio: answers[10] || '...',
      skills: answers[11] || '...',
      phone: formattedPhone || '...',
      username: formattedUsername || '...',
    });

    await ctx.reply(preview, {
      reply_markup: this.getConfirmationKeyboard(lang),
      parse_mode: 'Markdown',
    });
  }

  private async showVacancyConfirmation(
    ctx: Context,
    answers: any,
    lang: Language,
  ) {
    // Formatlangan ma'lumotlarni ko'rsatish
    const formattedSalary = this.formatSalary(answers[7] || '');
    const formattedPhone = this.formatPhone(answers[8] || '');
    const formattedUsername = this.formatUsername(answers[9] || '');

    const preview = this.t(lang, 'confirmation_messages.vacancy_preview', {
      job: answers[1] || '...',
      company: answers[2] || '...',
      workType: answers[3] || '...',
      region: answers[4] || '...',
      level: answers[5] || '...',
      requirements: answers[6] || '...',
      salary: formattedSalary || '...',
      phone: formattedPhone || '...',
      username: formattedUsername || '...',
    });

    await ctx.reply(preview, {
      reply_markup: this.getConfirmationKeyboard(lang),
      parse_mode: 'Markdown',
    });
  }

  // ===== EDIT MENU KO'RSATISH =====
  private async showRezumeEditMenu(ctx: Context, answers: any, lang: Language) {
    await ctx.reply(this.t(lang, 'edit_prompt'), {
      reply_markup: this.getRezumeEditKeyboard(lang),
    });
  }

  private async showVacancyEditMenu(
    ctx: Context,
    answers: any,
    lang: Language,
  ) {
    await ctx.reply(this.t(lang, 'edit_prompt'), {
      reply_markup: this.getVacancyEditKeyboard(lang),
    });
  }

  // ===== CALLBACK QUERY HANDLER - Post amallari =====
  @Action(/approve_|reject_|edit_/)
  async handlePostAction(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const data = callbackQuery.data;
    const adminId = ctx.from?.id.toString();
    const lang = Language.UZ;

    try {
      const message = ctx.callbackQuery?.message;

      if (!message || !('message_id' in message)) {
        console.error('Message not found in callback query');
        await ctx.answerCbQuery(this.t(lang, 'errors.message_not_found'));
        return;
      }

      const messageId = message.message_id;

      if (data.startsWith('approve_')) {
        // Call the service method that returns proper JobPostsTelegramEntity with relations
        const result = await this.botAdminService.approvePost(messageId, ctx);

        // Ensure result contains the job_post relation
        if (!result || !result.job_posts_id) {
          throw new Error('Job post not found in the result');
        }

        await this.jobPostsTelegramService.createPostForChannel({
          ...result,
          job_posts_id: result.job_posts_id, // Explicitly pass the ID
        });

        try {
          await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
          await ctx.answerCbQuery(this.t(lang, 'admin.post_approved_success'));
        } catch (error) {
          console.error("Post o'chirishda xatolik:", error);
          await ctx.answerCbQuery(this.t(lang, 'admin.post_approved_success'));
        }
      }
    } catch (error) {
      console.error('Error in handlePostAction:', error);
      await ctx.answerCbQuery(this.t(lang, 'errors.general'));
    }
  }

  @Action('skip')
  async skipField(@Ctx() ctx: BotContext, lang: Language) {
    ctx.session.step++;
    await ctx.answerCbQuery("O'tkazildi");
    this.botSerchWorkService.askNextField(ctx, lang);
  }

  @Command('filter')
  async startFilter(@Ctx() ctx: BotContext, lang: Language) {
    ctx.session.filter = {};
    ctx.session.step = 0;

    await ctx.reply(
      "Filterni boshlaymiz.\n'Skip' bosib o‘tib ketishingiz mumkin.",
    );

    this.botSerchWorkService.askNextField(ctx, lang);
  }

  // ===== ADMIN FLOW LARI =====
  // private async handleAdminFlow(
  //   @Ctx() ctx: Context,
  //   msg: any,
  //   state: any,
  //   chatId: string,
  //   lang: Language,
  // ) {
  //   // if (state.mode === 'awaiting_new_admin') {
  //   //   await this.handleAdminAdd(ctx, msg, state, chatId, lang);
  //   //   return;
  //   // }

  //   if (state.mode === 'awaiting_edit_post') {
  //     await this.handleAdminPostEdit(ctx, msg, state, chatId, lang);
  //     return;
  //   }

  //   if (state.mode === 'awaiting_reject_reason') {
  //     await this.handleAdminRejectReason(ctx, msg, state, chatId, lang);
  //     return;
  //   }
  // }

  // ===== ADMIN ASOSIY MENYU =====
  // private async handleAdminMainMenu(
  //   @Ctx() ctx: Context,
  //   text: string,
  //   chatId: string,
  //   lang: Language,
  // ) {
  //   switch (text) {
  //     case this.t(lang, 'pending_posts'):
  //       const pendingPosts = await this.botAdminService.getPendingPosts();
  //       if (pendingPosts.length === 0) {
  //         await ctx.reply(this.t(lang, 'admin.no_pending_posts'));
  //       } else {
  //         let message = this.t(lang, 'admin.pending_posts_list');
  //         pendingPosts.forEach((post, index) => {
  //           message += `${index + 1}. ${post.type === 'rezume' ? 'REZYUME' : 'VAKANSIYA'} - ID: ${post.id}\n`;
  //           message += `   👤 ${this.t(lang, 'user')}: @${post.userInfo?.username || this.t(lang, 'unknown')}\n`;
  //           message += `   🕐 ${this.t(lang, 'date')}: ${post.createdAt.toLocaleDateString()}\n\n`;
  //         });
  //         await ctx.reply(message);
  //       }
  //       break;

  //     case this.t(lang, 'statistics'):
  //       const stats = await this.botAdminService.getStatistics();
  //       const statsMessage = this.t(lang, 'admin.statistics', {
  //         totalUsers: stats.totalUsers,
  //         totalPosts: stats.totalPosts,
  //         pendingPosts: stats.pendingPosts,
  //         approvedPosts: stats.approvedPosts,
  //         rejectedPosts: stats.rejectedPosts,
  //         rezumePosts: stats.rezumePosts,
  //         vacancyPosts: stats.vacancyPosts,
  //       });

  //       await ctx.reply(statsMessage);
  //       break;

  //     case this.t(lang, 'admins'):
  //       const admins = await this.botAdminService.getAllAdmins();
  //       let adminList = this.t(lang, 'admin.admins_list');
  //       admins.forEach((admin, index) => {
  //         adminList += `${index + 1}. ID: ${admin.id}\n`;
  //         adminList += `   ${this.t(lang, 'username')}: @${admin.username}\n`;
  //         adminList += `   ${this.t(lang, 'phone')}: ${admin.phone || this.t(lang, 'not_provided')}\n`;
  //         adminList += `   ${this.t(lang, 'joined')}: ${new Date(admin.joinedAt).toLocaleDateString()}\n\n`;
  //       });
  //       await ctx.reply(adminList);
  //       break;

  //     case this.t(lang, 'add_admin'):
  //       this.botAdminService.setAdminState(chatId, {
  //         mode: 'awaiting_new_admin',
  //       });
  //       await ctx.reply(this.t(lang, 'admin.add_admin_instructions'));
  //       break;

  //     case this.t(lang, 'back_to_main'):
  //       await this.showMainMenu(ctx, lang);
  //       break;

  //     default:
  //       // Command larni tekshirish
  //       if (text.startsWith('/approve_')) {
  //         const postId = parseInt(text.replace('/approve_', ''));
  //         await this.handleApproveCommand(ctx, postId, lang);
  //         return;
  //       }

  //       if (text.startsWith('/reject_')) {
  //         const parts = text.replace('/reject_', '').split('_');
  //         const postId = parseInt(parts[0]);
  //         this.botAdminService.setAdminState(chatId, {
  //           mode: 'awaiting_reject_reason',
  //           postId: postId,
  //         });
  //         await ctx.reply(
  //           this.t(lang, 'admin.reject_reason_prompt', { postId }),
  //         );
  //         return;
  //       }

  //       if (text.startsWith('/edit_')) {
  //         const postId = parseInt(text.replace('/edit_', ''));
  //         this.botAdminService.setAdminState(chatId, {
  //           mode: 'awaiting_edit_post',
  //           postId: postId,
  //         });

  //         const post = await this.botAdminService.getPostById(postId);
  //         if (post) {
  //           const fields = this.t(lang, `edit_fields.${post.type}`);
  //           await ctx.reply(
  //             this.t(lang, 'admin.edit_post_instructions', {
  //               postId: postId,
  //               fields: fields,
  //             }),
  //           );
  //         }
  //         return;
  //       }

  //       await this.showAdminMainMenu(ctx, lang);
  //   }
  // }

  // ===== POST TASDIQLASH =====
  // private async handleApproveCommand(
  //   ctx: Context,
  //   postId: number,
  //   lang: Language,
  // ) {
  //   const result = await this.botAdminService.approvePost(postId, ctx.telegram);
  //   await ctx.reply(
  //     this.t(
  //       lang,
  //       result.success ? 'admin.post_approved_success' : 'admin.post_not_found',
  //     ),
  //   );
  // }

  // ===== POST TAHRILLASH =====
  // private async handleAdminPostEdit(
  //   @Ctx() ctx: Context,
  //   msg: any,
  //   state: any,
  //   chatId: string,
  //   lang: Language,
  // ) {
  //   if ('text' in msg && msg.text) {
  //     const text = msg.text;
  //     const postId = state.postId;

  //     // Format: field_number: yangi qiymat
  //     const match = text.match(/^(\d+):\s*(.+)$/);
  //     if (!match) {
  //       await ctx.reply(
  //         this.t(lang, 'admin.edit_post_instructions', {
  //           postId: postId,
  //           fields: '',
  //         }),
  //       );
  //       return;
  //     }

  //     const field = parseInt(match[1]);
  //     const value = match[2].trim();

  //     const result = await this.botAdminService.editPost(postId, field, value);

  //     if (result.success) {
  //       await ctx.reply(
  //         this.t(lang, 'admin.post_edited_success', {
  //           postId: postId,
  //           field: field,
  //           value: value,
  //         }),
  //       );
  //     } else {
  //       await ctx.reply(this.t(lang, 'admin.post_not_found'));
  //     }

  //     this.botAdminService.deleteAdminState(chatId);
  //     await this.showAdminMainMenu(ctx, lang);
  //   }
  // }

  // ===== POST RAD ETISH SABABI =====
  // private async handleAdminRejectReason(
  //   @Ctx() ctx: Context,
  //   msg: any,
  //   state: any,
  //   chatId: string,
  //   lang: Language,
  // ) {
  //   if ('text' in msg && msg.text) {
  //     const reason = msg.text;
  //     const postId = state.postId;

  //     const result = await this.botAdminService.rejectPost(
  //       postId,
  //       reason,
  //       ctx.telegram,
  //     );

  //     await ctx.reply(
  //       this.t(
  //         lang,
  //         result.success
  //           ? 'admin.post_rejected_success'
  //           : 'admin.post_not_found',
  //       ),
  //     );
  //     this.botAdminService.deleteAdminState(chatId);
  //     await this.showAdminMainMenu(ctx, lang);
  //   }
  // }
}
