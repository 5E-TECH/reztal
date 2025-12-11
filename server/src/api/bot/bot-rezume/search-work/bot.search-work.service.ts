import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { FILTER_FIELDS } from '../../common/work-filter-question';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import { I18nService } from 'src/i18n/i18n.service';
import { Language, Post_Type } from 'src/common/enums';
import { BotAdminService } from '../../bot-admin/bot.admin.service';

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
      return {
        caption: `
  ▫️${result.subCategory.translations.name || 'Lavozim'} kerak
  
  💰 Maosh: ${result.salary || 'Kelishilgan'}
  
  Kompaniya: ${result.user.name || '...'}
  Hudud: ${result.address || '...'}
  Ish turi: ${result.work_format || '...'}
  Talablar: ${result.skills || '...'}
  
  Aloqa uchun:
  ${result.user.phone_number || ''}
  ${result.user.telegram_username || ''}
  
  - - - - -
  
  🏢 Vakansiya joylash: @Reztalpost
  
  @Reztal_jobs bilan eng mosini toping!
          `.trim(),
      };
    } catch (error) {
      console.log(error);
      return error.message;
    }
  }

  async showResults(ctx, lang: Language) {
    try {
      const filters = ctx.session.filter;
      const results = await this.jobService.workFilter(filters, lang);
      if (!results.data.data.length) {
        return ctx.reply('❌ Hech narsa topilmadi');
      }
      // this.formatFilteredData(results, ctx);
      const vacancies = results.data.data.map((r) => {
        const formattedAnswer = this.formatFilteredData(r, ctx);
        return formattedAnswer;
      });
      for (const vacancy of vacancies) {
        await ctx.reply(vacancy.caption);
      }
    } catch (error) {
      console.log(error);
      return error.message;
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
