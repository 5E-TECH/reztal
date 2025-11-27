import { Update, Start, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { BotService as BotRezumeService } from './bot-rezume/bot.rezume.service';
import { BotVacancyService as BotVacancyService } from './bot-vacancy/bot.service';

@Update()
export class BotMainUpdate {
  constructor(
    private botRezumeService: BotRezumeService,
    private botVacancyService: BotVacancyService,
  ) {}

  // ===== KEYBOARD LAR =====
  private confirmationKeyboard = {
    keyboard: [['✅ Tasdiqlash', '✏️ Tahrirlash']],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  private rezumeEditKeyboard = {
    keyboard: [
      ['1. Kasb', '2. Tajriba', '3. Maosh'],
      ['4. Ism', '5. Yosh', '6. Jins'],
      ['7. Hudud', '8. Tillar', '9. Portfolio'],
      ["10. Ko'nikmalar", '11. Telefon', '12. Username'],
      ['✅ Tasdiqlash'],
    ],
    resize_keyboard: true,
  };

  private vacancyEditKeyboard = {
    keyboard: [
      ['1. Kasb', '2. Kompaniya', '3. Hudud'],
      ['4. Ish turi', '5. Maosh', '6. Talablar'],
      ['7. Username', '8. Telefon'],
      ['✅ Tasdiqlash'],
    ],
    resize_keyboard: true,
  };

  // ===== FORMAT FUNCTIONS =====
  private formatSalary(salary: string): string {
    if (!salary) return '';

    // Maoshni tozalash
    const cleaned = salary.trim();

    // Agar faqat raqamlar bo'lsa
    if (/^\d+$/.test(cleaned)) {
      // Formatlash: 3 xonalik guruhlarga ajratish
      const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return formatted;
    }

    // Agar allaqachon formatlangan bo'lsa yoki boshqa belgilar bo'lsa
    return salary;
  }

  private formatPhone(phone: string): string {
    if (!phone) return '';

    // Telefon raqamini tozalash
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `(+${cleaned})`;
    } else if (cleaned.startsWith('+998') && cleaned.length === 13) {
      return `(${cleaned})`;
    } else if (cleaned.length >= 9) {
      return `(+${cleaned})`;
    }

    return phone;
  }

  private formatUsername(username: string): string {
    if (!username) return '';

    // @ belgisini olib tashlash
    let cleaned = username.replace(/@/g, '');

    // Agar username bo'sh bo'lsa
    if (!cleaned.trim()) return '';

    // @ qo'shish
    return `@${cleaned}`;
  }

  // ===== VALIDATION FUNCTIONS =====
  private isValidRegion(region: string, validRegions: string[]): boolean {
    return validRegions.includes(region);
  }

  private isValidWorkType(workType: string, validWorkTypes: string[]): boolean {
    return validWorkTypes.includes(workType);
  }

  private isValidPhone(phone: string): { isValid: boolean; message?: string } {
    if (!phone) {
      return {
        isValid: false,
        message: '❗ Iltimos, telefon raqamingizni kiriting.',
      };
    }

    // Faqat + belgisini saqlab, boshqa belgilarni olib tashlash
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Faqat 13 ta belgini qabul qilish (+ bilan birga)
    if (cleaned.length !== 13) {
      return {
        isValid: false,
        message:
          '❗ Iltimos, telefon raqamini +998xxxxxxxxx shaklida joʻnating.\n\nMisol: +998901234567\n\nSiz kiritgan raqam ' +
          cleaned.length +
          ' ta belgidan iborat.',
      };
    }

    // +998 bilan boshlanishini tekshirish
    if (!cleaned.startsWith('+998')) {
      return {
        isValid: false,
        message:
          '❗ Iltimos, telefon raqamini +998xxxxxxxxx shaklida joʻnating.\n\nMisol: +998901234567',
      };
    }

    return { isValid: true };
  }

  private isValidSalary(salary: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!salary) {
      return {
        isValid: false,
        message: '❗ Iltimos, maosh miqdorini kiriting.',
      };
    }

    // Maosh bo'sh bo'lmasligi kerak
    if (salary.trim().length === 0) {
      return {
        isValid: false,
        message: '❗ Iltimos, maosh miqdorini kiriting.',
      };
    }

    // Maosh juda uzun bo'lmasligi kerak
    if (salary.length > 50) {
      return {
        isValid: false,
        message: '❗ Maosh miqdori juda uzun. Iltimos, qisqaroq kiriting.',
      };
    }

    return { isValid: true };
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id.toString();
    // Barcha state larni tozalash
    this.botRezumeService.deleteUserState(chatId);
    this.botVacancyService.deleteEmployerState(chatId);

    await this.showMainMenu(ctx);
  }

  private async showMainMenu(@Ctx() ctx: Context) {
    await ctx.reply('🚀 Botga xush kelibsiz!\nQuyidagilardan birini tanlang:', {
      reply_markup: {
        keyboard: [['🧑‍💻 Ish kerak', '🏢 Xodim kerak']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    const msg = ctx.message;
    if (!msg) return;

    const chatId = ctx.chat!.id.toString();

    // ===== ASOSIY MENYU TANLOVLARI =====
    if ('text' in msg && msg.text) {
      if (msg.text === '/start') {
        await this.start(ctx);
        return;
      }

      if (msg.text === '🧑‍💻 Ish kerak') {
        const firstQuestion =
          await this.botRezumeService.startCollection(chatId);
        await ctx.reply(firstQuestion, {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      if (msg.text === '🏢 Xodim kerak') {
        const firstQuestion =
          await this.botVacancyService.startEmployerCollection(chatId);
        await ctx.reply(firstQuestion, {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
    }

    // ===== STATE LARNI TEKSHIRISH VA YO'NALTIRISH =====
    const rezumeState = this.botRezumeService.getUserState(chatId);
    const vacancyState = this.botVacancyService.getEmployerState(chatId);

    if (rezumeState) {
      await this.handleRezumeFlow(ctx, msg, rezumeState, chatId);
      return;
    }

    if (vacancyState) {
      await this.handleVacancyFlow(ctx, msg, vacancyState, chatId);
      return;
    }

    // ===== HECH QANDAY STATE YO'Q BO'LSA =====
    await this.showMainMenu(ctx);
  }

  // ===== ISH KERAK FLOW =====
  private async handleRezumeFlow(
    @Ctx() ctx: Context,
    msg: any,
    state: any,
    chatId: string,
  ) {
    // ===== CONFIRMATION MODE =====
    if (state.confirmationMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === '✅ Tasdiqlash') {
          // Maosh va telefon formatlash
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

          const result = await this.botRezumeService.generateImage(
            formattedAnswers,
            state.gender,
          );

          // Faqat rasmni yuborish va klaviaturani olib tashlash
          await ctx.replyWithPhoto(
            { source: result.imagePath },
            {
              caption: result.caption,
              reply_markup: { remove_keyboard: true },
            },
          );

          // State ni tozalash
          this.botRezumeService.deleteUserState(chatId);
          return;
        }

        if (msg.text === '✏️ Tahrirlash') {
          state.confirmationMode = false;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }
      }
      return;
    }

    // ===== EDIT MODE =====
    if (state.editMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === '✅ Tasdiqlash') {
          state.editMode = false;
          state.confirmationMode = true;
          await this.showRezumeConfirmation(ctx, state.answers, state.gender);
          return;
        }

        const fieldMap = {
          '1. Kasb': 1,
          '2. Tajriba': 3,
          '3. Maosh': 4,
          '4. Ism': 5,
          '5. Yosh': 6,
          '6. Jins': 7,
          '7. Hudud': 8,
          '8. Tillar': 9,
          '9. Portfolio': 10,
          "10. Ko'nikmalar": 11,
          '11. Telefon': 12,
          '12. Username': 13,
        };

        if (fieldMap[msg.text]) {
          state.editingField = fieldMap[msg.text];
          state.editMode = false;

          // ===== MAXSUS FIELD LAR UCHUN TO'GRIDAN-TO'G'RI KEYBOARD =====
          if (state.editingField === 7) {
            // Jins
            await ctx.reply('7. Jinsingizni tanlang:', {
              reply_markup: this.botRezumeService.genderKeyboard,
            });
            return;
          }

          if (state.editingField === 8) {
            // Hudud
            await ctx.reply('8. Yashash joyingizni tanlang:', {
              reply_markup: this.botRezumeService.regionsKeyboard,
            });
            return;
          }

          if (state.editingField === 9) {
            // Tillar
            await ctx.reply(
              '9. Til bilimingizni tanlang (bir nechta tanlashingiz mumkin):',
              {
                reply_markup: this.botRezumeService.languageKeyboard,
              },
            );
            return;
          }

          if (state.editingField === 12) {
            // Telefon
            await ctx.reply('12. Telefon raqamingiz (+998xxxxxxxxx)?', {
              reply_markup: this.botRezumeService.phoneKeyboard,
            });
            return;
          }

          // ===== ODDIY MATN FIELD LARI =====
          const questions = this.botRezumeService.questions;
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
      if (field === 7) {
        // Jins
        const text = 'text' in msg ? msg.text : '';
        if (text === 'Erkak' || text === 'Ayol') {
          state.answers[field] = text;
          state.gender = text === 'Ayol' ? 'female' : 'male';
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }
        await ctx.reply(
          '❗ Iltimos, tugmalardan foydalaning va jinsingizni tanlang:',
          {
            reply_markup: this.botRezumeService.genderKeyboard,
          },
        );
        return;
      }

      if (field === 8) {
        // Hudud
        const text = 'text' in msg ? msg.text : '';
        const validRegions =
          this.botRezumeService.regionsKeyboard.keyboard.flat();

        // Hududni tekshirish (buttonlardagi variantlarni qabul qilish)
        if (this.isValidRegion(text, validRegions)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }

        // Agar user buttonlardan boshqa narsa yozsa
        await ctx.reply(
          '❗ Iltimos, yashash joyingizni tugmalardan birini tanlang yoki toʻgʻri kiriting:',
          {
            reply_markup: this.botRezumeService.regionsKeyboard,
          },
        );
        return;
      }

      if (field === 9) {
        // Tillar
        const text = 'text' in msg ? msg.text : '';

        if (!Array.isArray(state.answers[9])) state.answers[9] = [];

        if (text === 'Boshqa') {
          state.awaitingLanguageText = true;
          await ctx.reply('Til nomini yozing:');
          return;
        }

        if (state.awaitingLanguageText && text) {
          state.answers[9].push(text);
          state.awaitingLanguageText = false;

          await ctx.reply(
            `Qo'shildi: ${text}\nYana til tanlang yoki "🟢 Tanlashni yakunlash" tugmasini bosing.`,
            {
              reply_markup: this.botRezumeService.languageKeyboard,
            },
          );
          return;
        }

        if (text === '🟢 Tanlashni yakunlash') {
          if (state.answers[9].length === 0) {
            await ctx.reply('❗ Iltimos, kamida bitta tilni tanlang:', {
              reply_markup: this.botRezumeService.languageKeyboard,
            });
            return;
          }

          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }

        if (
          text &&
          this.botRezumeService.languageKeyboard.keyboard.flat().includes(text)
        ) {
          if (state.answers[9].includes(text)) {
            state.answers[9] = state.answers[9].filter((i) => i !== text);
            await ctx.reply(
              `O'chirildi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ') || "Yo'q"}`,
              {
                reply_markup: this.botRezumeService.languageKeyboard,
              },
            );
          } else {
            state.answers[9].push(text);
            await ctx.reply(
              `Tanlandi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ')}`,
              {
                reply_markup: this.botRezumeService.languageKeyboard,
              },
            );
          }
          return;
        }

        await ctx.reply('❗ Iltimos, tugmalardan foydalaning.', {
          reply_markup: this.botRezumeService.languageKeyboard,
        });
        return;
      }

      if (field === 12) {
        // Telefon
        let phone = '';

        if ('contact' in msg && msg.contact) {
          phone = msg.contact.phone_number;
        } else if ('text' in msg && msg.text) {
          phone = msg.text;
        }

        if (phone) {
          // Telefon raqamini tekshirish
          const validation = this.isValidPhone(phone);
          if (!validation.isValid) {
            await ctx.reply(validation.message!, {
              reply_markup: this.botRezumeService.phoneKeyboard,
            });
            return;
          }

          state.answers[field] = phone;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }

        await ctx.reply('❗ Iltimos, telefon raqamingizni yuboring:', {
          reply_markup: this.botRezumeService.phoneKeyboard,
        });
        return;
      }

      // ===== MAOSH FIELD =====
      if (field === 4) {
        // Maosh
        if ('text' in msg && msg.text) {
          // Maoshni tekshirish
          const validation = this.isValidSalary(msg.text);
          if (!validation.isValid) {
            await ctx.reply(validation.message!);
            return;
          }

          state.answers[field] = msg.text;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }
      }

      // ===== USERNAME FIELD =====
      if (field === 13) {
        // Username
        if ('text' in msg && msg.text) {
          const username = msg.text.trim();

          // Username ni tekshirish
          if (!username.startsWith('@')) {
            await ctx.reply(
              '❗ Iltimos, username @ belgisi bilan boshlansin. Masalan: @username\nQaytadan kiriting:',
            );
            return;
          }

          if (username.length < 2) {
            await ctx.reply(
              '❗ Iltimos, toʻgʻri username kiriting. Masalan: @username\nQaytadan kiriting:',
            );
            return;
          }

          state.answers[field] = username;
          state.editingField = null;
          state.editMode = true;
          await this.showRezumeEditMenu(ctx, state.answers);
          return;
        }
      }

      // Oddiy matn fieldlari
      if ('text' in msg && field !== 4 && field !== 13) {
        state.answers[field] = msg.text;
        state.editingField = null;
        state.editMode = true;
        await this.showRezumeEditMenu(ctx, state.answers);
        return;
      }

      return;
    }

    // ===== NORMAL FLOW =====
    const step = state.step;

    // ===== 4-QADAM — MAOSH =====
    if (step === 4) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        // Maoshni tekshirish
        const validation = this.isValidSalary(text);
        if (!validation.isValid) {
          await ctx.reply(validation.message!);
          return;
        }

        state.answers[4] = text;
        state.step = 5;

        await ctx.reply('5. Ismingiz?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
    }

    // ===== 8-QADAM — HUDUD TANLASH =====
    if (step === 8) {
      const text = 'text' in msg ? msg.text : '';
      const regionsKeyboard = this.botRezumeService.regionsKeyboard;
      const validRegions = regionsKeyboard.keyboard.flat();

      // Hududni tekshirish (buttonlardagi variantlarni qabul qilish)
      if (text && this.isValidRegion(text, validRegions)) {
        state.answers[8] = text;
        state.step = 9;

        await ctx.reply(
          '9. Til bilimingizni tanlang (bir nechta tanlashingiz mumkin):',
          {
            reply_markup: this.botRezumeService.languageKeyboard,
          },
        );
        return;
      }

      // Agar user buttonlardan boshqa narsa yozsa
      await ctx.reply(
        '❗ Iltimos, yashash joyingizni tugmalardan birini tanlang yoki toʻgʻri kiriting:',
        {
          reply_markup: regionsKeyboard,
        },
      );
      return;
    }

    // ===== 12-QADAM — TELEFON RAQAM =====
    if (step === 12) {
      let phone = '';

      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      } else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        // Telefon raqamini tekshirish
        const validation = this.isValidPhone(phone);
        if (!validation.isValid) {
          await ctx.reply(validation.message!, {
            reply_markup: this.botRezumeService.phoneKeyboard,
          });
          return;
        }

        state.answers[12] = phone;
        state.step = 13;

        await ctx.reply('13. Telegram username?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      await ctx.reply('❗ Iltimos, telefon raqamingizni yuboring:', {
        reply_markup: this.botRezumeService.phoneKeyboard,
      });
      return;
    }

    // ===== 13-QADAM — USERNAME =====
    if (step === 13) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        // Username ni tekshirish
        const username = text.trim();

        if (!username.startsWith('@')) {
          await ctx.reply(
            '❗ Iltimos, username @ belgisi bilan boshlansin. Masalan: @username\nQaytadan kiriting:',
          );
          return;
        }

        if (username.length < 2) {
          await ctx.reply(
            '❗ Iltimos, toʻgʻri username kiriting. Masalan: @username\nQaytadan kiriting:',
          );
          return;
        }

        state.answers[13] = username;
        state.confirmationMode = true;
        await this.showRezumeConfirmation(ctx, state.answers, state.gender);
        return;
      }

      await ctx.reply(
        '❗ Iltimos, telegram usernamingizni kiriting (@ belgisi bilan):',
      );
      return;
    }

    // ===== QOLGAN QADAMLAR =====
    const result = await this.botRezumeService.handleAnswer(chatId, msg);
    if (!result) return;

    if (typeof result === 'string') {
      if (result === 'step7') {
        await ctx.reply('7. Jinsingizni tanlang:', {
          reply_markup: this.botRezumeService.genderKeyboard,
        });
        return;
      }

      if (result === 'step8') {
        await ctx.reply('8. Yashash joyingizni tanlang:', {
          reply_markup: this.botRezumeService.regionsKeyboard,
        });
        return;
      }

      if (result === 'step12') {
        await ctx.reply('12. Telefon raqamingiz (+998xxxxxxxxx)?', {
          reply_markup: this.botRezumeService.phoneKeyboard,
        });
        return;
      }

      await ctx.reply(result, { reply_markup: { remove_keyboard: true } });
    } else if (result.confirmation) {
      // Confirmation mode ga o'tish
      state.confirmationMode = true;
      state.answers = result.answers;
      state.gender = result.gender;
      await this.showRezumeConfirmation(ctx, result.answers, result.gender);
    }
  }

  // ===== XODIM KERAK FLOW =====
  private async handleVacancyFlow(
    @Ctx() ctx: Context,
    msg: any,
    state: any,
    chatId: string,
  ) {
    // ===== CONFIRMATION MODE =====
    if (state.confirmationMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === '✅ Tasdiqlash') {
          // Maosh, telefon va username formatlash
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
            await this.botVacancyService.generateEmployerImage(
              formattedAnswers,
            );

          // Faqat rasmni yuborish va klaviaturani olib tashlash
          await ctx.replyWithPhoto(
            { source: result.imagePath },
            {
              caption: result.caption,
              reply_markup: { remove_keyboard: true },
            },
          );

          // State ni tozalash
          this.botVacancyService.deleteEmployerState(chatId);
          return;
        }

        if (msg.text === '✏️ Tahrirlash') {
          state.confirmationMode = false;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }
      }
      return;
    }

    // ===== EDIT MODE =====
    if (state.editMode) {
      if ('text' in msg && msg.text) {
        if (msg.text === '✅ Tasdiqlash') {
          state.editMode = false;
          state.confirmationMode = true;
          await this.showVacancyConfirmation(ctx, state.answers);
          return;
        }

        const fieldMap = {
          '1. Kasb': 1,
          '2. Kompaniya': 2,
          '3. Hudud': 3,
          '4. Ish turi': 4,
          '5. Maosh': 5,
          '6. Talablar': 6,
          '7. Username': 7,
          '8. Telefon': 8,
        };

        if (fieldMap[msg.text]) {
          state.editingField = fieldMap[msg.text];
          state.editMode = false;

          // ===== MAXSUS FIELD LAR UCHUN TO'GRIDAN-TO'G'RI KEYBOARD =====
          if (state.editingField === 3) {
            // Hudud
            await ctx.reply('3. Hudud?', {
              reply_markup: this.botVacancyService.regionsKeyboard,
            });
            return;
          }

          if (state.editingField === 4) {
            // Ish turi
            await ctx.reply('4. Ish turi?', {
              reply_markup: this.botVacancyService.workTypeKeyboard,
            });
            return;
          }

          if (state.editingField === 8) {
            // Telefon
            await ctx.reply('8. Telefon raqamingiz (+998xxxxxxxxx)?', {
              reply_markup: this.botVacancyService.phoneKeyboard,
            });
            return;
          }

          // ===== USERNAME FIELD =====
          if (state.editingField === 7) {
            // Username
            await ctx.reply('7. Telegram username (@ bilan)?', {
              reply_markup: { remove_keyboard: true },
            });
            return;
          }

          // ===== ODDIY MATN FIELD LARI =====
          const questions = this.botVacancyService.questions;
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

      if (field === 3) {
        // Hudud
        const text = 'text' in msg ? msg.text : '';
        const validRegions =
          this.botVacancyService.regionsKeyboard.keyboard.flat();

        // Hududni tekshirish (buttonlardagi variantlarni qabul qilish)
        if (this.isValidRegion(text, validRegions)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }

        // Agar user buttonlardan boshqa narsa yozsa
        await ctx.reply(
          '❗ Iltimos, hududni tugmalardan tanlang yoki toʻgʻri kiriting:',
          {
            reply_markup: this.botVacancyService.regionsKeyboard,
          },
        );
        return;
      }

      if (field === 4) {
        // Ish turi
        const text = 'text' in msg ? msg.text : '';
        const validWorkTypes = ['Offline', 'Online', 'Gibrid'];

        // Ish turini tekshirish (buttonlardagi variantlarni qabul qilish)
        if (this.isValidWorkType(text, validWorkTypes)) {
          state.answers[field] = text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }

        // Agar user buttonlardan boshqa narsa yozsa
        await ctx.reply(
          '❗ Iltimos, ish turini tugmalardan tanlang yoki toʻgʻri kiriting:',
          {
            reply_markup: this.botVacancyService.workTypeKeyboard,
          },
        );
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
          // Telefon raqamini tekshirish
          const validation = this.isValidPhone(phone);
          if (!validation.isValid) {
            await ctx.reply(validation.message!, {
              reply_markup: this.botVacancyService.phoneKeyboard,
            });
            return;
          }

          state.answers[field] = phone;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }

        await ctx.reply('❗ Iltimos, telefon raqamingizni yuboring:', {
          reply_markup: this.botVacancyService.phoneKeyboard,
        });
        return;
      }

      // ===== MAOSH FIELD =====
      if (field === 5) {
        // Maosh
        if ('text' in msg && msg.text) {
          // Maoshni tekshirish
          const validation = this.isValidSalary(msg.text);
          if (!validation.isValid) {
            await ctx.reply(validation.message!);
            return;
          }

          state.answers[field] = msg.text;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }
      }

      // ===== USERNAME FIELD =====
      if (field === 7) {
        // Username
        if ('text' in msg && msg.text) {
          const username = msg.text.trim();

          // Username ni tekshirish
          if (!username.startsWith('@')) {
            await ctx.reply(
              '❗ Iltimos, username @ belgisi bilan boshlansin. Masalan: @username\nQaytadan kiriting:',
            );
            return;
          }

          if (username.length < 2) {
            await ctx.reply(
              '❗ Iltimos, toʻgʻri username kiriting. Masalan: @username\nQaytadan kiriting:',
            );
            return;
          }

          state.answers[field] = username;
          state.editingField = null;
          state.editMode = true;
          await this.showVacancyEditMenu(ctx, state.answers);
          return;
        }
      }

      // Oddiy matn fieldlari
      if ('text' in msg && field !== 5 && field !== 7) {
        state.answers[field] = msg.text;
        state.editingField = null;
        state.editMode = true;
        await this.showVacancyEditMenu(ctx, state.answers);
        return;
      }

      return;
    }

    // ===== NORMAL FLOW =====
    const step = state.step;

    // ===== 3-QADAM — HUDUD TANLASH =====
    if (step === 3) {
      const text = 'text' in msg ? msg.text : '';
      const validRegions =
        this.botVacancyService.regionsKeyboard.keyboard.flat();

      // Hududni tekshirish (buttonlardagi variantlarni qabul qilish)
      if (text && this.isValidRegion(text, validRegions)) {
        state.answers[3] = text;
        state.step = 4;

        await ctx.reply('4. Ish turi?', {
          reply_markup: this.botVacancyService.workTypeKeyboard,
        });
        return;
      }

      // Agar user buttonlardan boshqa narsa yozsa
      await ctx.reply(
        '❗ Iltimos, hududni tugmalardan tanlang yoki toʻgʻri kiriting:',
        {
          reply_markup: this.botVacancyService.regionsKeyboard,
        },
      );
      return;
    }

    // ===== 4-QADAM — ISH TURI =====
    if (step === 4) {
      const text = 'text' in msg ? msg.text : '';
      const validWorkTypes = ['Offline', 'Online', 'Gibrid'];

      // Ish turini tekshirish (buttonlardagi variantlarni qabul qilish)
      if (text && this.isValidWorkType(text, validWorkTypes)) {
        state.answers[4] = text;
        state.step = 5;

        await ctx.reply('5. Maosh?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      // Agar user buttonlardan boshqa narsa yozsa
      await ctx.reply(
        '❗ Iltimos, ish turini tugmalardan tanlang yoki toʻgʻri kiriting:',
        {
          reply_markup: this.botVacancyService.workTypeKeyboard,
        },
      );
      return;
    }

    // ===== 5-QADAM — MAOSH =====
    if (step === 5) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        // Maoshni tekshirish
        const validation = this.isValidSalary(text);
        if (!validation.isValid) {
          await ctx.reply(validation.message!);
          return;
        }

        state.answers[5] = text;
        state.step = 6;

        await ctx.reply('6. Talablar?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
    }

    // ===== 7-QADAM — USERNAME =====
    if (step === 7) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        // Username ni tekshirish
        const username = text.trim();

        if (!username.startsWith('@')) {
          await ctx.reply(
            '❗ Iltimos, username @ belgisi bilan boshlansin. Masalan: @username\nQaytadan kiriting:',
          );
          return;
        }

        if (username.length < 2) {
          await ctx.reply(
            '❗ Iltimos, toʻgʻri username kiriting. Masalan: @username\nQaytadan kiriting:',
          );
          return;
        }

        state.answers[7] = username;
        state.step = 8;

        await ctx.reply('8. Telefon raqamingiz (+998xxxxxxxxx)?', {
          reply_markup: this.botVacancyService.phoneKeyboard,
        });
        return;
      }

      await ctx.reply(
        '❗ Iltimos, telegram usernamingizni kiriting (@ belgisi bilan):',
      );
      return;
    }

    // ===== 8-QADAM — TELEFON RAQAM =====
    if (step === 8) {
      let phone = '';

      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      } else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        // Telefon raqamini tekshirish
        const validation = this.isValidPhone(phone);
        if (!validation.isValid) {
          await ctx.reply(validation.message!, {
            reply_markup: this.botVacancyService.phoneKeyboard,
          });
          return;
        }

        state.answers[8] = phone;
        state.confirmationMode = true;
        await this.showVacancyConfirmation(ctx, state.answers);
        return;
      }

      await ctx.reply('❗ Iltimos, telefon raqamingizni yuboring:', {
        reply_markup: this.botVacancyService.phoneKeyboard,
      });
      return;
    }

    // ===== QOLGAN QADAMLAR (1-2, 6) =====
    const result = await this.botVacancyService.handleEmployerAnswer(
      chatId,
      msg,
    );
    if (!result) return;

    if (typeof result === 'string') {
      // ===== MAXSUS SIGNALLAR =====
      if (result === 'step3') {
        await ctx.reply('3. Hudud?', {
          reply_markup: this.botVacancyService.regionsKeyboard,
        });
        return;
      }

      if (result === 'step4') {
        await ctx.reply('4. Ish turi?', {
          reply_markup: this.botVacancyService.workTypeKeyboard,
        });
        return;
      }

      if (result === 'step8') {
        await ctx.reply('8. Telefon raqamingiz (+998xxxxxxxxx)?', {
          reply_markup: this.botVacancyService.phoneKeyboard,
        });
        return;
      }

      await ctx.reply(result, { reply_markup: { remove_keyboard: true } });
    } else if (result.confirmation) {
      // Confirmation mode ga o'tish
      state.confirmationMode = true;
      state.answers = result.answers;
      await this.showVacancyConfirmation(ctx, result.answers);
    }
  }

  // ===== CONFirmation KO'RSATISH =====
  private async showRezumeConfirmation(
    ctx: Context,
    answers: any,
    gender: string,
  ) {
    // Formatlangan ma'lumotlarni ko'rsatish
    const formattedSalary = this.formatSalary(answers[4] || '');
    const formattedPhone = this.formatPhone(answers[12] || '');
    const formattedUsername = this.formatUsername(answers[13] || '');

    const preview = `
📋 **Ma'lumotlaringizni tekshiring:**

🧑‍💼 Kasb: ${answers[1] || '...'}
📊 Tajriba: ${answers[3] || '...'}
💰 Maosh: ${formattedSalary || '...'}
👤 Ism: ${answers[5] || '...'}
🎂 Yosh: ${answers[6] || '...'}
⚧ Jins: ${answers[7] || '...'}
📍 Hudud: ${answers[8] || '...'}
🌐 Tillar: ${Array.isArray(answers[9]) ? answers[9].join(', ') : answers[9] || '...'}
📁 Portfolio: ${answers[10] || '...'}
💼 Ko'nikmalar: ${answers[11] || '...'}
📞 Telefon: ${formattedPhone || '...'}
👤 Username: ${formattedUsername || '...'}

*Ma'lumotlaringiz to'g'rimi?*
    `;

    await ctx.reply(preview, {
      reply_markup: this.confirmationKeyboard,
      parse_mode: 'Markdown',
    });
  }

  private async showVacancyConfirmation(ctx: Context, answers: any) {
    // Formatlangan ma'lumotlarni ko'rsatish
    const formattedSalary = this.formatSalary(answers[5] || '');
    const formattedPhone = this.formatPhone(answers[8] || '');
    const formattedUsername = this.formatUsername(answers[7] || '');

    const preview = `
📋 **Vakansiya ma'lumotlari:**

💼 Kasb: ${answers[1] || '...'}
🏢 Kompaniya: ${answers[2] || '...'}
📍 Hudud: ${answers[3] || '...'}
🖥️ Ish turi: ${answers[4] || '...'}
💰 Maosh: ${formattedSalary || '...'}
📋 Talablar: ${answers[6] || '...'}
👤 Username: ${formattedUsername || '...'}
📞 Telefon: ${formattedPhone || '...'}

*Ma'lumotlar to'g'rimi?*
    `;

    await ctx.reply(preview, {
      reply_markup: this.confirmationKeyboard,
      parse_mode: 'Markdown',
    });
  }

  // ===== EDIT MENU KO'RSATISH =====
  private async showRezumeEditMenu(ctx: Context, answers: any) {
    await ctx.reply('✏️ Qaysi maydonni tahrirlamoqchisiz?', {
      reply_markup: this.rezumeEditKeyboard,
    });
  }

  private async showVacancyEditMenu(ctx: Context, answers: any) {
    await ctx.reply('✏️ Qaysi maydonni tahrirlamoqchisiz?', {
      reply_markup: this.vacancyEditKeyboard,
    });
  }
}