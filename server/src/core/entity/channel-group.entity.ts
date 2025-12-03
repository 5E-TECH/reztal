import { BaseEntity } from 'src/common/database/BaseEntity';
import { Channel_Group_Status, Channel_Group_Type } from 'src/common/enums';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TasksEntity } from './tasks.entity';

@Entity('channel-group')
export class ChannelGroupEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'enum', enum: Channel_Group_Type })
  type: Channel_Group_Type;

  @Column({ type: 'bigint' })
  channel_group_id: number;

  @Column({ type: 'enum', enum: Channel_Group_Status })
  status: Channel_Group_Status;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => TasksEntity, (task) => task.channel_groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: TasksEntity;
}
