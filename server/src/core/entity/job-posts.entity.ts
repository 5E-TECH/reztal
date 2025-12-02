import { BaseEntity } from 'src/common/database/BaseEntity';
import { Level, Post_Status, Post_Type, Work_Format } from 'src/common/enums';
import { Column, Entity } from 'typeorm';

@Entity('job-posts')
export class JobPostsEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  position: string;

  @Column({ type: 'varchar' })
  experience: string;

  @Column({ type: 'enum', enum: Level })
  level: Level;

  @Column({ type: 'enum', enum: Work_Format })
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

  @Column({ type: 'enum', enum: Post_Status, default: Post_Status.ACTIVE })
  post_status: Post_Status;

  @Column({ type: 'enum', enum: Post_Type })
  type: Post_Type;

  @Column({ type: 'bigint' })
  view_count: number;
}
