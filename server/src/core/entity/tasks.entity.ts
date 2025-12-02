import { BaseEntity } from 'src/common/database/BaseEntity';
import { Task_Names, Task_Status } from 'src/common/enums';
import { Column, Entity } from 'typeorm';

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
}
