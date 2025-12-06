import { Module } from '@nestjs/common';
import { JobPostsTelegramService } from './job-posts-telegram.service';
import { JobPostsTelegramController } from './job-posts-telegram.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostsTelegramEntity } from 'src/core/entity/job-posts-telegram.entity';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobPostsTelegramEntity, JobPostsEntity])],
  controllers: [JobPostsTelegramController],
  providers: [JobPostsTelegramService],
  exports: [JobPostsTelegramService],
})
export class JobPostsTelegramModule {}
