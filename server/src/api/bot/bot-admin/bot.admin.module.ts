import { Module } from '@nestjs/common';
import { BotMainUpdate } from '../bot.main.update';
import { BotAdminService } from './bot.admin.service';

@Module({
  providers: [BotAdminService, BotMainUpdate],
})
export class BotModule {}