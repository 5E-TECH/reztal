import { Module } from '@nestjs/common';
import { BotRezumeService } from '../bot-rezume/bot.rezume.service';
import { BotMainUpdate } from '../bot.main.update';

@Module({
  providers: [BotRezumeService, BotMainUpdate],
})
export class BotModule {}
