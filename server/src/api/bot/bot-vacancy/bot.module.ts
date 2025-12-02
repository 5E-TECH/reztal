import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotVacancyService } from './bot.service';
import { BotMainUpdate } from '../bot.main.update';
import config from 'src/config';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: () => ({
        token: config.BOT_TOKEN!,
      }),
    }),
  ],
  providers: [BotVacancyService, BotMainUpdate],
})
export class BotModule {}
