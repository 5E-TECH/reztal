import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot/bot.update';
import { BotService } from './bot/bot.service';
// import { BotUpdate } from './bot/bot.update';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token:
        process.env.BOT_TOKEN ||
        '8560776804:AAHemL86sZR2uUWSt3aUqwE0-Ndy4uB_49U',
      include: [BotUpdate], // update classlarini shu yerga qo'shamiz
    }),
  ],
  providers: [BotUpdate, BotService], // providerlar shu modulda bo'lishi kerak
})
export class AppModule {}
