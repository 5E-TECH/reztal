import { Module } from '@nestjs/common';
import { BotRezumeService } from '../../bot-rezume/rezume/bot.rezume.service';
import { BotMainUpdate } from '../../bot.main.update';
import { UserService } from 'src/api/user/user.service';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import { UserEntity } from 'src/core/entity/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { JobCategoriesService } from 'src/api/job-categories/job-categories.service';
import { MyLogger } from 'src/logger/logger.service';

@Module({
  // imports: [TypeOrmModule.forFeature([CategoryEntity, UserEntity])],
  providers: [
    BotRezumeService,
    BotMainUpdate,
    UserService,
    JobPostsService,
    JobCategoriesService,
    MyLogger,
  ],
})
export class BotModule {}
