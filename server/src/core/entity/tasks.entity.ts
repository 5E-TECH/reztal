import { BaseEntity } from 'src/common/database/BaseEntity';
import { Task_Names, Task_Status } from 'src/common/enums';
import { Column, Entity, OneToMany } from 'typeorm';
import { UserTaskEntity } from './user-task.entity';
import { ChannelGroupEntity } from './channel-group.entity';

@Entity('tasks')
export class TasksEntity extends BaseEntity {
  @Column({ type: 'enum', enum: Task_Names })
  title: Task_Names;

  @Column({ type: 'enum', enum: Task_Status, default: Task_Status.INACTIVE })
  task_status: Task_Status;

  @Column({ type: 'int', nullable: true })
  friend_quantity: number;

  @Column({ type: 'bigint', nullable: true })
  payment_total: number;

  @OneToMany(() => UserTaskEntity, (userTask) => userTask.task)
  user_tasks: UserTaskEntity[];

  @OneToMany(() => ChannelGroupEntity, (channelGroup) => channelGroup.task)
  channel_groups: ChannelGroupEntity[];
}
