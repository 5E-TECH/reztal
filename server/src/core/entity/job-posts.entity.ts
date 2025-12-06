import { BaseEntity } from 'src/common/database/BaseEntity';
import { Level, Post_Status, Post_Type, Work_Format } from 'src/common/enums';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SubCategoryEntity } from './sub-category.entity';
import { UserEntity } from './user.entity';
import { JobPostsTelegramEntity } from './job-posts-telegram.entity';

@Entity('job-posts')
export class JobPostsEntity extends BaseEntity {
  @Column({ type: 'bigint', generated: 'increment' })
  post_id: string;

  @Column({ type: 'uuid' })
  sub_category_id: string;

  @Column({ type: 'varchar', nullable: true })
  experience: string;

  @Column({ type: 'enum', enum: Level, nullable: true })
  level: Level;

  @Column({ type: 'enum', enum: Work_Format, nullable: true })
  work_format: Work_Format;

  @Column({ type: 'text' })
  skills: string;

  @Column({ type: 'varchar' })
  salary: string;

  @Column({ type: 'varchar', nullable: true })
  age: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'text', nullable: true })
  language: string;

  @Column({ type: 'varchar', nullable: true })
  portfolio: string;

  @Column({ type: 'varchar' })
  telegram_username: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: Post_Status, default: Post_Status.PENDING })
  post_status: Post_Status;

  @Column({ type: 'enum', enum: Post_Type })
  type: Post_Type;

  @Column({ type: 'bigint', default: 0 })
  view_count: number;

  @ManyToOne(() => SubCategoryEntity, (subCategory) => subCategory.job_posts)
  @JoinColumn({ name: 'sub_category_id' })
  subCategory: SubCategoryEntity;

  @ManyToOne(() => UserEntity, (user) => user.job_posts)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(
    () => JobPostsTelegramEntity,
    (jobPostTelegram) => jobPostTelegram.job_post, // <-- to'g'ri
  )
  job_post_telegram: JobPostsTelegramEntity[];
}
