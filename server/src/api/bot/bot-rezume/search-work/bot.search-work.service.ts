import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { FILTER_FIELDS } from '../../common/work-filter-question';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import { I18nService } from 'src/i18n/i18n.service';
import { Language, Post_Type } from 'src/common/enums';
import { BotAdminService } from '../../bot-admin/bot.admin.service';
import { InputMediaPhoto } from 'telegraf/types';
import path from 'path';
import { existsSync, createReadStream } from 'fs';

@Injectable()
export class BotSearchWorkService {
  constructor(
    private readonly jobService: JobPostsService,
    private i18nService: I18nService,
    private adminBotService: BotAdminService,
  ) {}

  formatFilteredData(result: any, ctx) {
    try {
      console.log('FORMAT FILTER DATAGA KIRDI: ', result);
      const contactPhone = result.user.phone_number || '';
      const contactUsername = result.user.telegram_username || '';
      const showUsername =
        contactUsername &&
        contactUsername !== contactPhone &&
        contactUsername !== `+${contactPhone}`;

      const caption = `
  ▫️${result.subCategory.translations[0].name || 'Lavozim'} kerak
  
  💰 Maosh: ${result.salary || 'Kelishilgan'}
  
  Kompaniya: ${result.user.company_name || '...'}
  Hudud: ${result.address || '...'}
  Ish turi: ${result.work_format || '...'}
  Talablar: ${result.skills || '...'}
  
  Aloqa uchun:
  ${contactPhone || ''}
  ${showUsername ? contactUsername : ''}
  
  - - - - -
  
  🏢 Vakansiya joylash: @Reztalpost
  
  @Reztal_jobs bilan eng mosini toping!
          `.trim();

      let imagePath = '';

      if (result.image_path) {
        const isHttp = result.image_path.startsWith('http');

        if (isHttp) {
          imagePath = result.image_path;
        } else if (path.isAbsolute(result.image_path)) {
          // Already absolute local path
          imagePath = result.image_path;
        } else {
          // Relative file name -> resolve from uploads
          imagePath = path.join(
            process.cwd(),
            'uploads',
            path.basename(result.image_path),
          );
        }
      }

      console.log('Original image_path:', result.image_path);
      console.log('Resolved imagePath:', imagePath);

      return {
        caption,
        image_path: imagePath,
      };
    } catch (error) {
      console.log(error);
      return error.message;
    }
  }

  private formatResumeData(result: any) {
    const contactPhone = result.user.phone_number || '';
    const contactUsername = result.telegram_username || '';
    const showUsername =
      contactUsername &&
      contactUsername !== contactPhone &&
      contactUsername !== `+${contactPhone}`;

    const caption = `
▫️${result.subCategory.translations[0].name || 'Kasb'}

💰 Maosh: ${result.salary || 'Kelishilgan'}

Ism: ${result.user.name || '...'}
Hudud: ${result.address || '...'}
Tajriba: ${result.experience || '...'}
Ko'nikmalar: ${result.skills || '...'}

Aloqa uchun:
${contactPhone || ''}
${showUsername ? contactUsername : ''}

- - - - -

🧑‍💼 Rezyume joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
    `.trim();

    let imagePath = '';

    if (result.image_path) {
      const isHttp = result.image_path.startsWith('http');

      if (isHttp) {
        imagePath = result.image_path;
      } else if (path.isAbsolute(result.image_path)) {
        imagePath = result.image_path;
      } else {
        imagePath = path.join(
          process.cwd(),
          'uploads',
          path.basename(result.image_path),
        );
      }
    }

    console.log('Original image_path:', result.image_path);
    console.log('Resolved imagePath:', imagePath);

    return {
      caption,
      image_path: imagePath,
    };
  }

  private getSearchActionsKeyboard(lang: Language) {
    return {
      keyboard: [
        [
          this.i18nService.t(lang, 'search_again'),
          this.i18nService.t(lang, 'back_to_main'),
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }

  async showResults(
    ctx,
    lang: Language,
    type: Post_Type = Post_Type.VACANCY,
    filtersOverride?: any,
  ) {
    try {
      const filters = filtersOverride || ctx.session.filter;
      if (!filters) {
        await ctx.reply('❌ Filter topilmadi');
        return;
      }

      // Save last filters for pagination callbacks
      ctx.session.lastFilters = { ...filters };
      ctx.session.filter = { ...filters };

      const results = await this.jobService.workFilter(filters, lang, type);

      if (!results.data.data.length) {
        return ctx.reply('❌ Hech narsa topilmadi', {
          reply_markup: this.getSearchActionsKeyboard(lang),
        });
      }

      const vacancy =
        type === Post_Type.RESUME
          ? this.formatResumeData(results.data.data[0])
          : this.formatFilteredData(results.data.data[0], ctx);

      // ✅ Rasmni yuborish: URL bo'lsa to'g'ridan-to'g'ri, aks holda lokal fayl
      const fallbackImage = 'https://via.placeholder.com/400x200?text=No+Image';
      let photoSource: any = fallbackImage;
      let chosenPath: string | null = null;
      let chosenUrl: string | null = null;

      if (vacancy.image_path) {
        const isHttp = vacancy.image_path.startsWith('http');
        const trimmed = vacancy.image_path.trim();

        if (isHttp) {
          photoSource = trimmed;
          chosenUrl = trimmed;
        } else {
          const candidates = [
            path.isAbsolute(trimmed) ? trimmed : null,
            path.join(process.cwd(), 'uploads', path.basename(trimmed)),
            path.join(process.cwd(), 'src', 'uploads', path.basename(trimmed)),
            path.join(process.cwd(), '..', 'uploads', path.basename(trimmed)),
          ].filter(Boolean) as string[];

          chosenPath = candidates.find((p) => existsSync(p)) || null;

          if (chosenPath) {
            photoSource = { source: createReadStream(chosenPath) };
          }
        }
      }

      const totalVacancies = results.data.meta.total;
      const totalPages = Math.ceil(totalVacancies / 1);
      const page = filters.page;

      const keyboard = this.i18nService.getKeyboard(
        lang,
        'paginate',
        page,
        totalPages,
      );

      const sendWithFallback = async () => {
        try {
          return await ctx.replyWithPhoto(photoSource, {
            caption: vacancy.caption,
            reply_markup: keyboard,
            parse_mode: 'HTML',
          });
        } catch (err) {
          console.log('Photo send failed, falling back to placeholder:', err?.message);
          await ctx.replyWithPhoto(fallbackImage, {
            caption: vacancy.caption,
            reply_markup: keyboard,
            parse_mode: 'HTML',
          });
        }
      };

      // ✅ Callback bo'lsa, eski xabarni O'CHIRIB, yangisini yuborish
      if (ctx.callbackQuery?.message) {
        try {
          // 1. Avval eski xabarni o'chiramiz
          await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        } catch (deleteError) {
          console.log("Eski xabarni o'chirishda xato:", deleteError.message);
          // O'chirish muvaffaqiyatsiz bo'lsa ham davom etamiz
        }

        // 2. Yangi xabarni yuboramiz
        console.log('Sending vacancy photo (callback). Path:', chosenPath || chosenUrl || photoSource);

        await sendWithFallback();

        // 3. Callback query'ni javobsiz qoldirmaslik uchun
        await ctx.answerCbQuery();
      }
      // ✅ Yangi so'rov bo'lsa (birinch marta)
      else {
        console.log(
          'Sending vacancy photo (new). Path:',
          chosenPath || chosenUrl || photoSource,
        );

        await sendWithFallback();

        await ctx.reply(
          this.i18nService.t(lang, 'search_actions_prompt'),
          {
            reply_markup: this.getSearchActionsKeyboard(lang),
          },
        );
      }
    } catch (e) {
      console.log('ShowResults xatosi:', e.message);

      // Xatolik holatida oddiy tekst
      try {
        await ctx.reply('Xatolik !', {
          parse_mode: 'HTML',
        });
      } catch (err) {
        console.log('Fallback error:', err.message);
      }
    }
  }

  async askNextField(ctx, lang) {
    const step = ctx.session.step;
    if (step === 3) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx, lang);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'level'),
      });
    }
    if (step === 4) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx, lang);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'work_types'),
      });
    }
    if (step === 5) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx, lang);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'regions'),
      });
    }
    if (step >= 6) {
      return await this.showResults(ctx, lang);
    }
  }
}
