import { Module } from '@nestjs/common';
import { BotMainUpdate } from '../bot.main.update';
import { BotAdminService } from './bot.admin.service';
import { JobPostsTelegramService } from 'src/api/job-posts-telegram/job-posts-telegram.service';

@Module({
  providers: [BotAdminService, BotMainUpdate],
})
export class BotModule {}
