import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { FILTER_FIELDS } from '../../common/work-filter-question';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import { I18nService } from 'src/i18n/i18n.service';
import { Post_Type } from 'src/common/enums';

@Injectable()
export class BotSearchWorkService {
  constructor(
    private readonly jobService: JobPostsService,
    private i18nService: I18nService,
  ) {}
  async handleFilter(ctx: Context, filter: any) {}

  formatFilteredData(result: any, ctx): { caption: string } {
    const data = result.data;
    console.log('FORMAT FILTER DATAGA KIRDI: ', data);

    if (data.type === Post_Type.RESUME) {
      return {
        caption: `
  ▫️${data.subCategory.translations.name || 'Kasb'}
  
  💰 Maosh: ${data.salary || 'Kelishilgan'}
  
  Ism: ${data.user.name || '...'}
  Yosh: ${data.age || '...'}
  Tajriba: ${data.experience || '...'}
  Hudud: ${data.address || '...'}
  Tillar: ${data.language || '...'}
  Ko'nikmalar: ${data.skills || '...'}
  
  Aloqa uchun:
  ${data.user.phone_number || ''}
  ${data.telegram_username || ''}
  - - - - -
  
  🧑‍💼 Rezyume joylash: @Reztalpost
  
  @Reztal_jobs bilan eng mosini toping!
          `.trim(),
      };
    } else {
      const data = result;
      return {
        caption: `
  ▫️${data[1] || 'Lavozim'} kerak
  
  💰 Maosh: ${data[5] || 'Kelishilgan'}
  
  Kompaniya: ${data[2] || '...'}
  Hudud: ${data[3] || '...'}
  Ish turi: ${data[4] || '...'}
  Talablar: ${data[6] || '...'}
  
  Aloqa uchun:
  ${data[8] || ''} ${data[7] || ''}
  
  - - - - -
  
  🏢 Vakansiya joylash: @Reztalpost
  
  @Reztal_jobs bilan eng mosini toping!
          `.trim(),
      };
    }
  }

  async showResults(ctx) {
    const filters = ctx.session.filter;

    console.log('FILTER OXIRGI NATIJA: ', filters);

    const results = await this.jobService.workFilter(filters);

    console.log('FILTER OXIRGI NATIJAdan keyin: ', results);

    if (!results.data.length) {
      return ctx.reply('❌ Hech narsa topilmadi');
    }

    this.formatFilteredData(results, ctx);
    const text = results.data
      .map((r) => `• ${r.title} — ${r.company}`)
      .join('\n');

    await ctx.reply(`Natija:\n\n${text}`);
  }

  async askNextField(ctx) {
    const step = ctx.session.step;
    if (step === 3) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'level'),
      });
    }
    if (step === 4) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'work_types'),
      });
    }
    if (step === 5) {
      const fieldNum = step - 2;
      const field = FILTER_FIELDS[fieldNum];

      if (!field) {
        return this.showResults(ctx);
      }

      await ctx.reply(`Quyidagi fieldni tanlang: ${field}`, {
        reply_markup: this.i18nService.getKeyboard(ctx.lang, 'regions'),
      });
    }
    if (step >= 6) {
      return this.showResults(ctx);
    }
  }
}
