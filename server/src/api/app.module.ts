import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotAdminService } from './bot/bot-admin/bot.admin.service';
import { BotService } from './bot/bot-rezume/bot.rezume.service';
import { BotMainUpdate } from './bot/bot.main.update';
import { BotVacancyService } from './bot/bot-vacancy/bot.service';
import { UserModule } from './user/user.module';
import config from 'src/config';
import { LoggerModule } from 'src/logger/logger.module';
import { JobPostsModule } from './job-posts/job-posts.module';
import { JobCategoriesModule } from './job-categories/job-categories.module';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: config.BOT_TOKEN!,
    }),
    UserModule,
    LoggerModule,
    JobPostsModule,
    JobCategoriesModule,
  ],
  providers: [BotAdminService, BotService, BotMainUpdate, BotVacancyService], // providerlar shu modulda bo'lishi kerak
})
export class AppModule {}
