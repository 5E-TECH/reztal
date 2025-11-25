import { Module } from '@nestjs/common';
import { BotService } from '../bot/bot.service';
import { BotUpdate } from '../bot/bot.update';

@Module({
  providers: [BotService, BotUpdate],
})
export class BotModule {}
