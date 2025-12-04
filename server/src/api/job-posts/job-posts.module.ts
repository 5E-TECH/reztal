import { Module } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JobPostsController } from './job-posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobPostsEntity])],
  controllers: [JobPostsController],
  providers: [JobPostsService],
})
export class JobPostsModule {}
