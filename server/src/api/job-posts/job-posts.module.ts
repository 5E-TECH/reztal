import { Module } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JobPostsController } from './job-posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPostsEntity, SubCategoryTranslationEntity]),
  ],
  controllers: [JobPostsController],
  providers: [JobPostsService],
  exports: [JobPostsService],
})
export class JobPostsModule {}
