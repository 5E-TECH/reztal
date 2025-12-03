import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';
import { TasksEntity } from './tasks.entity';

@Entity('user-task')
export class UserTaskEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'boolean', default: false })
  is_done: boolean;

  @ManyToOne(() => UserEntity, (user) => user.user_tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => TasksEntity, (task) => task.user_tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: TasksEntity;
}
