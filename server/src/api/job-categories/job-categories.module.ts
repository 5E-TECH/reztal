import { Module } from '@nestjs/common';
import { JobCategoriesService } from './job-categories.service';
import { JobCategoriesController } from './job-categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SubCategoryEntity } from 'src/core/entity/sub-category.entity';
import { CategoryTranslationEntity } from 'src/core/entity/category_translation.entity';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryEntity,
      SubCategoryEntity,
      CategoryTranslationEntity,
      SubCategoryTranslationEntity,
    ]),
  ],
  controllers: [JobCategoriesController],
  providers: [JobCategoriesService],
  exports: [JobCategoriesService],
})
export class JobCategoriesModule {}
