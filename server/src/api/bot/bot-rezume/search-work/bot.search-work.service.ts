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
      const caption = `
  ▫️${result.subCategory.translations[0].name || 'Lavozim'} kerak
  
  💰 Maosh: ${result.salary || 'Kelishilgan'}
  
  Kompaniya: ${result.user.company_name || '...'}
  Hudud: ${result.address || '...'}
  Ish turi: ${result.work_format || '...'}
  Talablar: ${result.skills || '...'}
  
  Aloqa uchun:
  ${result.user.phone_number || ''}
  ${result.user.telegram_username || ''}
  
  - - - - -
  
  🏢 Vakansiya joylash: @Reztalpost
  
  @Reztal_jobs bilan eng mosini toping!
          `.trim();

      let imagePath = '';

      if (result.image_path) {
        // Agar to'liq lokal yo'l bo'lsa
        if (result.image_path.startsWith('/')) {
          // Faqat fayl nomini olish
          const fileName = path.basename(result.image_path);
          // To'g'ri URL yaratish
          imagePath = `${process.env.HOST_URL}/uploads/${fileName}`;
        }
        // Agar faqat fayl nomi bo'lsa
        else if (!result.image_path.startsWith('http')) {
          imagePath = `${process.env.HOST_URL}/uploads/${result.image_path}`;
        }
        // Agar allaqachon URL bo'lsa
        else {
          imagePath = result.image_path;
        }
      }

      console.log('Original image_path:', result.image_path);
      console.log('Converted imagePath:', imagePath);

      return {
        caption,
        image_path: imagePath,
      };
    } catch (error) {
      console.log(error);
      return error.message;
    }
  }

  async showResults(ctx, lang: Language) {
    try {
      const filters = ctx.session.filter;
      if (!filters) {
        await ctx.reply('❌ Filter topilmadi');
        return;
      }

      const results = await this.jobService.workFilter(filters, lang);

      if (!results.data.data.length) {
        return ctx.reply('❌ Hech narsa topilmadi');
      }

      const vacancy = this.formatFilteredData(results.data.data[0], ctx);

      // ✅ Rasmni to'g'ridan yuklash (URL emas)
      let photoSource: any;
      if (vacancy.image_path && existsSync(vacancy.image_path)) {
        photoSource = { source: createReadStream(vacancy.image_path) };
      } else {
        photoSource = 'https://via.placeholder.com/400x200?text=No+Image';
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
        await ctx.replyWithPhoto(photoSource, {
          caption: vacancy.caption,
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });

        // 3. Callback query'ni javobsiz qoldirmaslik uchun
        await ctx.answerCbQuery();
      }
      // ✅ Yangi so'rov bo'lsa (birinch marta)
      else {
        await ctx.replyWithPhoto(photoSource, {
          caption: vacancy.caption,
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
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
