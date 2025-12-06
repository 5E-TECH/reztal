import { BaseEntity } from 'src/common/database/BaseEntity';
import { Chat_Type } from 'src/common/enums';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { JobPostsEntity } from './job-posts.entity';

@Entity('job_posts_telegram')
export class JobPostsTelegramEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  job_posts_id: string;

  @Column({ type: 'enum', enum: Chat_Type })
  chat_type: Chat_Type;

  @Column({ type: 'varchar' })
  chat_id: string;

  @Column({ type: 'varchar' })
  message_id: string;

  @ManyToOne(() => JobPostsEntity, (job_posts) => job_posts.job_post_telegram)
  @JoinColumn({ name: 'job_posts_id' })
  job_post: JobPostsEntity;
}
