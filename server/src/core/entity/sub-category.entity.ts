import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { JobPostsEntity } from './job-posts.entity';
import { SubCategoryTranslationEntity } from './sub_category_translation';

@Entity('sub_category')
export class SubCategoryEntity extends BaseEntity {
  @ManyToOne(() => CategoryEntity, (category) => category.sub_categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @OneToMany(() => SubCategoryTranslationEntity, (t) => t.subCategory, {
    cascade: true,
  })
  translations: SubCategoryTranslationEntity[];

  @OneToMany(() => JobPostsEntity, (jobPosts) => jobPosts.subCategory)
  job_posts: JobPostsEntity[];
}
