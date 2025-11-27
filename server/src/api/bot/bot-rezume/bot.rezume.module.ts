import { Module } from '@nestjs/common';
import { BotService } from '../bot-rezume/bot.rezume.service';
import { BotMainUpdate } from '../bot.main.update';

@Module({
  providers: [BotService, BotMainUpdate],
})
export class BotModule {}
