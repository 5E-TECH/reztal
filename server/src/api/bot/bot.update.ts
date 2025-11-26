import { Update, Start, On, Ctx, Hears } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
  constructor(private botService: BotService) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id.toString();
    this.botService.deleteUserState(chatId);

    await this.showMainMenu(ctx);
  }

  @Hears('/start')
  async startCommand(@Ctx() ctx: Context) {
    const chatId = ctx.chat!.id.toString();
    this.botService.deleteUserState(chatId);

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
    let state = this.botService.getUserState(chatId);

    // ===== ASOSIY MENYU =====
    if ('text' in msg && msg.text) {
      // /start komandasi
      if (msg.text === '/start') {
        await this.startCommand(ctx);
        return;
      }

      if (msg.text === '🧑‍💻 Ish kerak') {
        const first = await this.botService.startCollection(chatId);
        await ctx.reply(first, { reply_markup: { remove_keyboard: true } });
        return;
      }

      if (msg.text === '🏢 Xodim kerak') {
        await ctx.reply('Hozircha bu bo‘lim ishlab chiqilmoqda 👨‍💻', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
    }

    if (!state) return;

    // ================================
    //       6-QADAMDAN KEYIN 7-QADAM
    // ================================
    if (state.step === 6) {
      const text = 'text' in msg ? msg.text : '';

      if (text) {
        state.answers[6] = text;
        state.step = 7;

        await ctx.reply('7. Jinsingizni tanlang:', {
          reply_markup: this.botService.genderKeyboard,
        });
        return;
      }
    }

    // ================================
    //       7-QADAM — JINS TANLASH
    // ================================
    if (state.step === 7) {
      const text = 'text' in msg ? msg.text : '';

      if (!text) {
        await ctx.reply('7. Jinsingizni tanlang:', {
          reply_markup: this.botService.genderKeyboard,
        });
        return;
      }

      if (text === 'Erkak' || text === 'Ayol') {
        state.answers[7] = text;
        state.gender = text === 'Ayol' ? 'female' : 'male';

        state.step = 8;

        await ctx.reply('8. Yashash joyingizni tanlang:', {
          reply_markup: this.botService.regionsKeyboard,
        });
        return;
      }

      await ctx.reply(
        '❗ Iltimos, tugmalardan foydalaning va jinsingizni tanlang:',
        {
          reply_markup: this.botService.genderKeyboard,
        },
      );
      return;
    }

    // ================================
    //        8-QADAM — VILOYATLAR
    // ================================
    if (state.step === 8) {
      const text = 'text' in msg ? msg.text : '';
      const regionsKeyboard = this.botService.regionsKeyboard;

      if (text && regionsKeyboard.keyboard.flat().includes(text)) {
        state.answers[8] = text;
        state.step = 9;

        await ctx.reply(
          '9. Til bilimingizni tanlang (bir nechta tanlashingiz mumkin):',
          {
            reply_markup: this.botService.languageKeyboard,
          },
        );
        return;
      }

      await ctx.reply(
        '❗ Iltimos, yashash joyingizni tugmalardan birini tanlang:',
        {
          reply_markup: regionsKeyboard,
        },
      );
      return;
    }

    // ================================
    //  9-QADAM — MULTI-SELECT TILLAR
    // ================================
    if (state.step === 9) {
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
          { reply_markup: this.botService.languageKeyboard },
        );
        return;
      }

      if (text === '🟢 Tanlashni yakunlash') {
        if (state.answers[9].length === 0) {
          await ctx.reply('❗ Iltimos, kamida bitta tilni tanlang:', {
            reply_markup: this.botService.languageKeyboard,
          });
          return;
        }

        state.step = 10;
        await ctx.reply('10. Portfolio (agar bo‘lsa)?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      if (
        text &&
        this.botService.languageKeyboard.keyboard.flat().includes(text)
      ) {
        if (state.answers[9].includes(text)) {
          state.answers[9] = state.answers[9].filter((i) => i !== text);
          await ctx.reply(
            `O'chirildi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ') || "Yo'q"}`,
            {
              reply_markup: this.botService.languageKeyboard,
            },
          );
        } else {
          state.answers[9].push(text);
          await ctx.reply(
            `Tanlandi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ')}`,
            {
              reply_markup: this.botService.languageKeyboard,
            },
          );
        }
        return;
      }

      await ctx.reply('❗ Iltimos, tugmalardan foydalaning.', {
        reply_markup: this.botService.languageKeyboard,
      });
      return;
    }

    // ================================
    //   10-QADAM — PORTFOLIO
    // ================================
    if (state.step === 10) {
      const text = 'text' in msg ? msg.text : '';
      state.answers[10] = text || '';
      state.step = 11;

      await ctx.reply('11. Sohangizga aloqador ko‘nikmalarni kiriting:', {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    // ================================
    //   11-QADAM — KONIKMALAR
    // ================================
    if (state.step === 11) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        state.answers[11] = text;
        state.step = 12;

        await ctx.reply('12. Telefon raqamingiz?', {
          reply_markup: this.botService.phoneKeyboard,
        });
        return;
      }
    }

    // ================================
    //   12-QADAM — TELEFON RAQAM
    // ================================
    if (state.step === 12) {
      let phone = '';

      // Kontakt orqali
      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      }
      // Matn orqali
      else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        state.answers[12] = phone;
        state.step = 13;

        await ctx.reply('13. Telegram username?', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      await ctx.reply('❗ Iltimos, telefon raqamingizni yuboring:', {
        reply_markup: this.botService.phoneKeyboard,
      });
      return;
    }

    // ================================
    //   13-QADAM — USERNAME
    // ================================
    if (state.step === 13) {
      const text = 'text' in msg ? msg.text : '';
      if (text) {
        state.answers[13] = text;
        state.step = 14; // Yakunlash uchun

        // Generate image va yakunlash
        const result = await this.botService.generateImage(
          state.answers,
          state.gender,
        );

        await ctx.replyWithPhoto(
          { source: result.imagePath },
          { caption: result.caption },
        );

        this.botService.deleteUserState(chatId);
        return;
      }

      await ctx.reply('❗ Iltimos, telegram usernamingizni kiriting:');
      return;
    }

    // ================================
    // DEFAULT — QOLGAN QADAMLAR (1-6)
    // ================================
    const result = await this.botService.handleAnswer(chatId, msg);
    if (!result) return;

    if (typeof result === 'string') {
      if (result === 'step7') {
        // 6-qadamdan keyin 7-qadamga o'tish
        await ctx.reply('7. Jinsingizni tanlang:', {
          reply_markup: this.botService.genderKeyboard,
        });
        return;
      }

      if (result === 'step12') {
        // 11-qadamdan keyin 12-qadamga o'tish
        await ctx.reply('12. Telefon raqamingiz?', {
          reply_markup: this.botService.phoneKeyboard,
        });
        return;
      }

      await ctx.reply(result, { reply_markup: { remove_keyboard: true } });
    } else if (result.imagePath) {
      await ctx.replyWithPhoto(
        { source: result.imagePath },
        { caption: result.caption },
      );
      this.botService.deleteUserState(chatId);
    }
  }
}
