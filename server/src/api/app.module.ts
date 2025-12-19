import { Module, OnModuleInit } from '@nestjs/common';
import { InjectBot, TelegrafModule } from 'nestjs-telegraf';
import { BotAdminService } from './bot/bot-admin/bot.admin.service';
import { BotMainUpdate } from './bot/bot.main.update';
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
import { BotRezumeService } from './bot/bot-rezume/rezume/bot.rezume.service';
import { BotVacancyService } from './bot/bot-vacancy/vacancy/bot.service';
import { BotSearchWorkService } from './bot/bot-rezume/search-work/bot.search-work.service';
import { session, Telegraf } from 'telegraf';
import { MySession } from './bot/common/interfaces';
import { Language } from 'src/common/enums';
// import { LocalSession } from 'telegraf-session-local';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: config.DB_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
    TelegrafModule.forRootAsync({
      useFactory: () => ({
        token: config.BOT_TOKEN,
        middlewares: [
          session({
            defaultSession: (): MySession => ({
              step: 0,
              filter: {
                sub_category: null,
                work_format: null,
                level: null,
                location: null,
                page: 1,
                language: Language.UZ,
              },
              category: null,
            }),
          }),
        ],
      }),
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
  providers: [
    BotAdminService,
    BotRezumeService,
    BotMainUpdate,
    BotVacancyService,
    I18nService,
    UserLanguageService,
    BotSearchWorkService,
  ], // providerlar shu modulda bo'lishi kerak
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    // this.bot.use(session()); // 🔥 SESSION shu yerda ulanadi

    console.log('Telegram session merdevare ENABLED');
  }
}
