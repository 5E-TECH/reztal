import { Update, Start, On, Ctx } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
  constructor(private botService: BotService) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    console.log(ctx);
    const q = this.botService.startCollection(ctx.chat!.id.toString());
    await ctx.reply('🚀 Botga xush kelibsiz!\n' + q);
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    console.log('on message');

    const result = await this.botService.handleAnswer(
      ctx.chat!.id.toString(),
      ctx.message,
    );

    if (!result) return;

    // Agar rasm + caption qaytsa
    if (
      typeof result === 'object' &&
      'imagePath' in result &&
      'caption' in result
    ) {
      await ctx.replyWithPhoto(
        { source: result.imagePath },
        { caption: result.caption },
      );
    } else if (typeof result === 'string') {
      // oddiy matn javob
      await ctx.reply(result);
    }
  }
}
