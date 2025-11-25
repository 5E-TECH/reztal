import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot/bot.update';
import { BotService } from './bot/bot.service';
// import { BotUpdate } from './bot/bot.update';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token:
        process.env.BOT_TOKEN || 'token_here',
    }),
  ],
  providers: [BotUpdate, BotService], // providerlar shu modulda bo'lishi kerak
})
export class AppModule { }
