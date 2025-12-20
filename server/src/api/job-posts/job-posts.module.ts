import { Module } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JobPostsController } from './job-posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';
import { UserEntity } from 'src/core/entity/user.entity';
import { BotAdminService } from '../bot/bot-admin/bot.admin.service';
import { JobPostsTelegramService } from '../job-posts-telegram/job-posts-telegram.service';
import { UserLanguageService } from '../user/user-language.service';
import { JobPostsTelegramEntity } from 'src/core/entity/job-posts-telegram.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobPostsEntity,
      SubCategoryTranslationEntity,
      UserEntity,
      JobPostsTelegramEntity,
    ]),
  ],
  controllers: [JobPostsController],
  providers: [
    JobPostsService,
    BotAdminService,
    JobPostsTelegramService,
    UserLanguageService,
  ],
  exports: [JobPostsService],
})
export class JobPostsModule {}
