import { BaseEntity } from 'src/common/database/BaseEntity';
import { Roles, User_Status } from 'src/common/enums';
import { Column, Entity, Index } from 'typeorm';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Index()
  @Column({ type: 'varchar' })
  phone_number: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'enum', enum: Roles })
  role: Roles;

  @Column({ type: 'enum', enum: User_Status })
  status: User_Status;

  @Column({ type: 'bigint' })
  telegram_id: bigint;

  @Column({ type: 'boolean', nullable: true })
  see_vacancy: boolean;

  @Column({ type: 'boolean', nullable: true })
  add_resume: boolean;
}
