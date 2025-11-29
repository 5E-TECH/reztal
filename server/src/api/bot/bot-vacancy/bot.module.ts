import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotVacancyService } from './bot.service';
import { BotMainUpdate } from '../bot.main.update';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: () => ({
        token: process.env.BOT_TOKEN!,
      }),
    }),
  ],
  providers: [BotVacancyService, BotMainUpdate],
})
export class BotModule {}
