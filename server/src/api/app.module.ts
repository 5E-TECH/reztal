import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';


import { BotAdminService } from './bot/bot-admin/bot.admin.service';

import { BotService } from './bot/bot-rezume/bot.rezume.service';

import { BotMainUpdate } from './bot/bot.main.update';

import { BotVacancyService } from './bot/bot-vacancy/bot.service';


@Module({
  imports: [
    TelegrafModule.forRoot({
      token:
        process.env.BOT_TOKEN!,
    }),
  ],
  providers: [BotAdminService, BotService, BotMainUpdate, BotVacancyService], // providerlar shu modulda bo'lishi kerak
})
export class AppModule { }
