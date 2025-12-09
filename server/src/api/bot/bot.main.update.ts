import { Update, Start, On, Ctx, Action, Command } from 'nestjs-telegraf';
import { Context, NarrowedContext } from 'telegraf';
import { BotRezumeService as BotRezumeService } from '../bot/bot-rezume/rezume/bot.rezume.service';
import { BotVacancyService as BotVacancyService } from '../bot/bot-vacancy/vacancy/bot.service';
import { BotAdminService } from './bot-admin/bot.admin.service';

// I18n service import qilish kerak
import { I18nService } from '../../i18n/i18n.service';
// import type { Language } from '../../i18n/i18n.service';
import { UserLanguageService } from '../../api/user/user-language.service';
import { Language, Roles, Work_Format } from 'src/common/enums';
import { UserService } from '../user/user.service';
import { JobPostsService } from '../job-posts/job-posts.service';
import { JobPostsTelegramService } from '../job-posts-telegram/job-posts-telegram.service';
import { FILTER_FIELDS } from './common/work-filter-question';
import { BotSearchWorkService } from './bot-rezume/search-work/bot.search-work.service';

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

  // ===== VALIDATION FUNCTIONS =====
  private isValidRegion(region: string, lang: Language): boolean {
    const regions = this.i18nService
      .getKeyboard(lang, 'regions')
      .keyboard.flat();
    return regions.includes(region);
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

  // ===== START COMMAND =====
  @Start()
  async start(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id.toString();

    const userId = ctx.from!.id.toString();

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

  // ===== ASOSIY MENYU =====
  private async showMainMenu(@Ctx() ctx: Context, lang: Language) {
    const dto = { telegram_id: String(ctx.chat?.id) };
    try {
      const user = await this.userService.getAdmin(dto);
      console.log(user);

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
          "Salom men Reztal botman. Ushbu guruhga postlarni tasdiqlash uchun jo'natib turaman",
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
          "Salom men Reztal botman. Ushbu guruhga postlarni tasdiqlash uchun jo'natib turaman",
        );
      }
    }
  }

  // ===== MESSAGE HANDLER =====
  @On('message')
  async onMessage(@Ctx() ctx, lang: Language) {
    const msg = ctx.message;
    if (!msg) return;

    const chatId = ctx.chat!.id.toString();
    const userId = ctx.from!.id.toString();

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
          await ctx.reply(
            'Iltimos, quyidagi kategoriyalardan birini tanlang:',
            {
              reply_markup: this.i18nService.getCategoryKeyboard(userLang),
            },
          );
        }, 0);
        return;
      }

      // 1. AVVAL "search_job" tugmasi bosilganda
      if (msg.text === this.t(userLang, 'search_job')) {
        console.log('Search jobga kirdi', msg.text);

        // Sessionni ishga tushirish
        // if (!ctx.session || ctx.session.step === undefined) {
        //   ctx.session = {
        //     step: 0,
        //     category: null,
        //     subcategory: null,
        //     filters: {},
        //   };
        // }

        // Faqat step 0 ga qaytarish
        ctx.session.step = 0;

        // Kategoriyalarni chiqarish
        await ctx.reply('Iltimos, kategoriyani tanlang:', {
          reply_markup: this.i18nService.getCategoryKeyboard(lang),
        });

        // Stepni 1 ga o'zgartirish
        ctx.session.step = 1;
        return;
      }

      // 2. AGAR SESSIONDA STEP BOR BO'LSA (ya'ni search jarayonida bo'lsa)
      if (
        ctx.session &&
        ctx.session.step !== undefined &&
        ctx.session.step > 0
      ) {
        console.log('Search jarayonida, step:', ctx.session.step);

        const step = ctx.session.step;

        const text = msg.text.trim();
        const translation = this.i18nService.getTranslation(lang);

        // ================ STEP 1: KATEGORIYANI QABUL QILISH ================
        if (step === 1) {
          console.log('STEP 1 - Kategoriya qabul qilinmoqda');

          // Foydalanuvchi yuborgan kategoriyani tekshirish

          const categories = translation.category?.categories || [];

          const category = categories.find((cat: any) => cat.name === text);

          if (category) {
            console.log('Kategoriya tanlandi:', category.name);

            // Kategoriyani sessionga saqlash
            ctx.session.category = category.name;

            // Subkategoriya keyboardini yuborish
            await ctx.reply(
              `${category.name} kategoriyasidan pastagi mutaxassislikni tanlang:`,
              {
                reply_markup: this.i18nService.getSubCategoryKeyboard(
                  lang,
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
              "Noto'g'ri kategoriya. Iltimos, qaytadan tanlang:",
              {
                reply_markup: this.i18nService.getCategoryKeyboard(lang),
              },
            );
            // STEP 1 da qolamiz
            return;
          }
        }

        // ================ STEP 2: SUBCATEGORY QABUL QILISH ================
        if (step === 2) {
          console.log('STEP 2 - Subkategoriya qabul qilinmoqda');

          if (!ctx.session.category) {
            // Agar kategoriya yo'q bo'lsa, qayta boshlash
            ctx.session.step = 0;
            await ctx.reply('Kategoriya topilmadi. Qayta boshlaymiz...');
            return;
          }

          const translation = this.i18nService.getTranslation(lang);
          const categories = translation.category?.categories || [];

          console.log('Categoriyalar', categories);

          const category = categories.find(
            (cat: any) => cat.name === ctx.session.category,
          );

          console.log('BU TANLANGAN CATEGORY', category);

          if (category && category.sub_categories) {
            const subcategories = category.sub_categories;
            console.log('SUBCATEGORIYALAR', subcategories);

            const selectedSubcategory = subcategories.find(
              (sub: any) => sub === msg.text.trim(),
            );

            console.log('TANLANGAN SUB-CAT', selectedSubcategory);

            if (selectedSubcategory) {
              console.log('Subkategoriya tanlandi:', selectedSubcategory);

              // Subkategoriyani sessionga saqlash
              ctx.session.filter.sub_category = selectedSubcategory;

              const levelRequiredCategories = [
                'Dasturlash',
                'Dizayn',
                'Marketing',
              ];
              if (levelRequiredCategories.includes(ctx.session.category)) {
                ctx.session.step = 3;
              } else {
                ctx.session.step = 4;
              }
              // Keyingi filterga o'tish

              await ctx.reply(
                `✅ Tanlandi: ${ctx.session.category} / ${ctx.session.filter.sub_category}`,
              );

              // Keyingi filterni so'rash
              await this.botSerchWorkService.askNextField(ctx);
              return;
            }
          }

          // Subkategoriya topilmasa, qayta so'rash
          await ctx.reply(
            "Noto'g'ri mutaxassislik. Iltimos, qaytadan tanlang:",
            {
              reply_markup: this.i18nService.getSubCategoryKeyboard(
                lang,
                ctx.session.category,
              ),
            },
          );
          return;
        }

        if (step === 3) {
          const levels = translation.level;
          console.log('LEVELLAR', levels);
          const level = text.toLowerCase();
          const currentLevel = levels[level];
          if (currentLevel) {
            ctx.session.filter.level = currentLevel;
            ctx.session.step = 4;
            await ctx.reply(`✅ Tanlandi: ${currentLevel}`);
            await this.botSerchWorkService.askNextField(ctx);
          } else {
            await ctx.reply(`Noto'g'ri qiymat, qayta urining`);
            await this.botSerchWorkService.askNextField(ctx);
          }

          // Stepni 3 ga o'zgartirish

          return;
        }
        if (step === 4) {
          const workTypes = translation.work_types;
          console.log('Formats: ', workTypes);
          const work_type = workTypes.includes(text);
          if (work_type) {
            ctx.session.filter.work_format = text;
            if (text === 'Online') {
              ctx.session.step = 6;
            } else {
              ctx.session.step = 5;
            }
            await ctx.reply(`✅ Tanlandi: ${text}`);
            await this.botSerchWorkService.askNextField(ctx);
          } else {
            await ctx.reply(`Noto'g'ri qiymat, qayta urining`);
            await this.botSerchWorkService.askNextField(ctx);
          }
        }
        if (step === 5) {
          const regions = translation.regions;
          console.log('Regions: ', regions);
          const exists = regions.flat().includes(text);
          if (exists) {
            ctx.session.filter.location = text;
            ctx.session.step = 6;
            await ctx.reply(`✅ Tanlandi: ${text}`);
            await this.botSerchWorkService.askNextField(ctx);
          } else {
            await ctx.reply(`Noto'g'ri qiymat, qayta urining`);
            await this.botSerchWorkService.askNextField(ctx);
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

      if (msg.text === this.t(userLang, 'search_employee')) {
        await ctx.reply(this.t(userLang, 'search_employee_message'), {
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
    @Ctx() ctx: Context,
    msg: any,
    state: any,
    chatId: string,
    lang: Language,
  ) {
    console.log('=== VACANCY FLOW ===');
    console.log('Current step:', state.step);

    // ===== CONFIRMATION MODE =====
    if (state.confirmationMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === this.t(lang, 'confirmation')) {
          // Maosh va telefon formatlash
          const formattedAnswers = { ...state.answers };
          if (formattedAnswers[5]) {
            formattedAnswers[5] = this.formatSalary(formattedAnswers[5]);
          }
          if (formattedAnswers[8]) {
            formattedAnswers[8] = this.formatPhone(formattedAnswers[8]);
          }
          if (formattedAnswers[7]) {
            formattedAnswers[7] = this.formatUsername(formattedAnswers[7]);
          }

          const result =
            await this.botVacancyService.generateVacancyImage(formattedAnswers);

          // POSTNI SAQLASH VA ADMINGA YUBORISH
          const post = await this.botAdminService.addPost({
            type: 'vacancy',
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
            status: 'pending',
          });

          // Adminlarga yangi post haqida xabar yuborish
          await this.botAdminService.notifyAdminAboutNewPost(
            post,
            ctx.telegram,
          );

          // Userga xabar
          await ctx.replyWithPhoto(
            { source: result.imagePath },
            {
              caption: this.t(lang, 'confirmation_messages.vacancy_submitted', {
                postId: post.id,
              }),
              parse_mode: 'Markdown',
              reply_markup: { remove_keyboard: true },
            },
          );

          // State ni tozalash
          this.botVacancyService.deleteEmployerState(chatId);
          return;
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
            // Hudud
            await ctx.reply(this.t(lang, 'vacancy_questions')[2], {
              reply_markup: this.botVacancyService.getKeyboard(lang, 'regions'),
            });
            return;
          }

          if (state.editingField === 4) {
            // Ish turi
            await ctx.reply(this.t(lang, 'vacancy_questions')[3], {
              reply_markup: this.botVacancyService.getKeyboard(
                lang,
                'work_types',
              ),
            });
            return;
          }

          if (state.editingField === 8) {
            // Telefon
            await ctx.reply(this.t(lang, 'vacancy_questions')[7], {
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
      if (field === 3) {
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

      if (field === 4) {
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

      if (field === 8) {
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
      if (field === 5) {
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
      if (field === 7) {
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
      if ('text' in msg && field !== 5 && field !== 7) {
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

    console.log('Result from BotVacancyService:', result);

    if (!result) return;

    if (typeof result === 'string') {
      // ===== MAXSUS SIGNALLAR =====
      if (result === 'step3') {
        await ctx.reply(this.t(lang, 'vacancy_questions')[2], {
          reply_markup: this.botVacancyService.getKeyboard(lang, 'regions'),
        });
        return;
      }

      if (result === 'step4') {
        await ctx.reply(this.t(lang, 'vacancy_questions')[3], {
          reply_markup: this.botVacancyService.getKeyboard(lang, 'work_types'),
        });
        return;
      }

      await ctx.reply(this.t(lang, result), {
        reply_markup: { remove_keyboard: true },
      });
      return;
    } else if (result.message) {
      await ctx.reply(result.message, {
        reply_markup: result.keyboard || { remove_keyboard: true },
      });
      return;
    } else if (result.confirmation) {
      state.confirmationMode = true;
      state.answers = result.answers;
      await this.showVacancyConfirmation(ctx, result.answers, lang);
      return;
    }
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

  // ===== ISH KERAK FLOW =====
  private async handleRezumeFlow(
    @Ctx() ctx: Context,
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

            console.log('User data:  ', userData);

            const userCreateResponse =
              await this.userService.createCandidate(userData);

            console.log('User create response: ', userCreateResponse);

            if (!`${userCreateResponse.statusCode}`.startsWith('2')) {
              return 'Error on creating user';
            }

            const result = await this.botRezumeService.generateImage(
              formattedAnswers,
              state.gender,
            );

            console.log('Result img path', result.imagePath);

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

            console.log(createResume.message);

            const post = await this.botAdminService.addPost({
              type: 'rezume',
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
              status: 'pending',
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
              'Iltimos, quyidagi kategoriyalardan birini tanlang:',
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
              await ctx.reply('Kasbingizni tanlang:', {
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
              `${category.name} kategoriyasidan pastagi mutaxassislikni tanlang:`,
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
              `Iltimos, "${state.selectedCategory}" kategoriyasidan pastagi mutaxassislikni tanlang:`,
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
            'Iltimos, kasbingizni quyidagi kategoriyalardan tanlang:',
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
    const formattedSalary = this.formatSalary(answers[5] || '');
    const formattedPhone = this.formatPhone(answers[8] || '');
    const formattedUsername = this.formatUsername(answers[7] || '');

    const preview = this.t(lang, 'confirmation_messages.vacancy_preview', {
      job: answers[1] || '...',
      company: answers[2] || '...',
      region: answers[3] || '...',
      workType: answers[4] || '...',
      salary: formattedSalary || '...',
      requirements: answers[6] || '...',
      username: formattedUsername || '...',
      phone: formattedPhone || '...',
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
    console.log('Callback query received');

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const data = callbackQuery.data;
    const adminId = ctx.from?.id.toString();
    const lang = Language.UZ;

    try {
      // Original message ni olish callback query dan
      const message = ctx.callbackQuery?.message;

      if (!message || !('message_id' in message)) {
        console.error('Message not found in callback query');
        await ctx.answerCbQuery(this.t(lang, 'errors.message_not_found'));
        return;
      }

      const messageId = message.message_id;
      console.log('Message id: ', messageId);

      if (data.startsWith('approve_')) {
        const post = await this.botAdminService.approvePost(
          messageId,
          ctx.telegram,
        );

        const jobPostChannel =
          await this.jobPostsTelegramService.createPostForChannel(Object(post));

        console.log('Yakuniy natija: ', jobPostChannel.message);

        try {
          // Botdagi post xabarini o'chirish
          // await ctx.deleteMessage();

          await ctx.answerCbQuery(this.t(lang, 'admin.post_approved_success'));
        } catch (error) {
          console.error("Post o'chirishda xatolik:", error);
          await ctx.answerCbQuery(this.t(lang, 'admin.post_approved_success'));
        }
      }
      // else if (data.startsWith('reject_')) {
      //   // Data dan postId ni olish
      //   const match = data.match(/reject_(\d+)/);
      //   const postId = match ? parseInt(match[1]) : null;

      //   if (!postId) {
      //     await ctx.answerCbQuery(this.t(lang, 'errors.invalid_post_id'));
      //     return;
      //   }

      //   // Admin dan sabab so'rash
      //   await ctx.reply(this.t(lang, 'admin.reject_reason_prompt', { postId }));
      //   this.botAdminService.setAdminState(adminId, {
      //     mode: 'awaiting_reject_reason',
      //     postId: postId,
      //   });

      //   await ctx.answerCbQuery(this.t(lang, 'edit_prompt'));
      // } else if (data.startsWith('edit_')) {
      //   // Data dan postId ni olish
      //   const match = data.match(/edit_(\d+)/);
      //   const postId = match ? parseInt(match[1]) : null;

      //   if (!postId) {
      //     await ctx.answerCbQuery(this.t(lang, 'errors.invalid_post_id'));
      //     return;
      //   }

      //   const post = await this.botAdminService.getPostById(postId);
      //   if (post) {
      //     const fields = this.t(lang, `edit_fields.${post.type}`);
      //     await ctx.reply(
      //       this.t(lang, 'admin.edit_post_instructions', {
      //         postId: postId,
      //         fields: fields,
      //       }),
      //     );

      //     this.botAdminService.setAdminState(adminId, {
      //       mode: 'awaiting_edit_post',
      //       postId: postId,
      //     });
      //   }

      //   await ctx.answerCbQuery(this.t(lang, 'edit_prompt'));
      // }
    } catch (error) {
      console.error('Error in handlePostAction:', error);
      await ctx.answerCbQuery(this.t(lang, 'errors.general'));
    }
  }

  @Action('skip')
  async skipField(@Ctx() ctx) {
    ctx.session.step++;
    await ctx.answerCbQuery("O'tkazildi");
    this.botSerchWorkService.askNextField(ctx);
  }

  @Command('filter')
  async startFilter(@Ctx() ctx) {
    ctx.session.filter = {};
    ctx.session.step = 0;

    await ctx.reply(
      "Filterni boshlaymiz.\n'Skip' bosib o‘tib ketishingiz mumkin.",
    );

    this.botSerchWorkService.askNextField(ctx);
  }
}
