import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { JobPostsEntity } from './job-posts.entity';

@Entity('sub_category')
export class SubCategoryEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => CategoryEntity, (category) => category.sub_categories)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @OneToMany(() => JobPostsEntity, (jobPosts) => jobPosts.subCategory)
  job_posts: JobPostsEntity[];
}
