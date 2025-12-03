import { Module } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JobPostsController } from './job-posts.controller';

@Module({
  controllers: [JobPostsController],
  providers: [JobPostsService],
})
export class JobPostsModule {}
