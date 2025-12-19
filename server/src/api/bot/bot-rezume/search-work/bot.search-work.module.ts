import { Module } from '@nestjs/common';
import { BotMainUpdate } from '../../bot.main.update';
import { session, Telegraf } from 'telegraf';
import { BotSearchWorkService } from './bot.search-work.service';
import { InjectBot } from 'nestjs-telegraf';

@Module({
  providers: [BotMainUpdate, BotSearchWorkService],
})
export class BotModule {}
