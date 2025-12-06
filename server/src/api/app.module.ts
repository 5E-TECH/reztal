import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotAdminService } from './bot/bot-admin/bot.admin.service';
import { BotRezumeService } from './bot/bot-rezume/bot.rezume.service';
import { BotMainUpdate } from './bot/bot.main.update';
import { BotVacancyService } from './bot/bot-vacancy/bot.service';
import { UserModule } from './user/user.module';
import config from 'src/config';
import { LoggerModule } from 'src/logger/logger.module';
import { JobPostsModule } from './job-posts/job-posts.module';
import { JobCategoriesModule } from './job-categories/job-categories.module';
import { I18nService } from 'src/i18n/i18n.service';
import { UserLanguageService } from './user/user-language.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from './tasks/tasks.module';
import { UserTasksModule } from './user-tasks/user-tasks.module';
import { ChannelGroupModule } from './channel-group/channel-group.module';
import { JobPostsTelegramModule } from './job-posts-telegram/job-posts-telegram.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.DB_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
    TelegrafModule.forRoot({
      token: config.BOT_TOKEN!,
    }),
    UserModule,
    LoggerModule,
    JobPostsModule,
    JobCategoriesModule,
    TasksModule,
    UserTasksModule,
    ChannelGroupModule,
    JobPostsTelegramModule,
  ],
  providers: [BotAdminService, BotRezumeService, BotMainUpdate, BotVacancyService, I18nService, UserLanguageService], // providerlar shu modulda bo'lishi kerak
})
export class AppModule {}
