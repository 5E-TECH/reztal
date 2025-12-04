import { BaseEntity } from 'src/common/database/BaseEntity';
import { Roles, User_Status } from 'src/common/enums';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { JobPostsEntity } from './job-posts.entity';
import { UserTaskEntity } from './user-task.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Index()
  @Column({ type: 'varchar' })
  phone_number: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'enum', enum: Roles })
  role: Roles;

  @Column({ type: 'enum', enum: User_Status, default: User_Status.ACTIVE })
  status: User_Status;

  @Column({ type: 'varchar' })
  telegram_id: string;

  @Column({ type: 'boolean', nullable: true })
  see_vacancy: boolean;

  @Column({ type: 'boolean', nullable: true })
  add_resume: boolean;

  @OneToMany(() => JobPostsEntity, (jobPosts) => jobPosts.user)
  job_posts: JobPostsEntity[];

  @OneToMany(() => UserTaskEntity, (userTask) => userTask.user)
  user_tasks: UserTaskEntity[];
}
