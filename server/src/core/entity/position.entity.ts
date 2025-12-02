import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity } from 'typeorm';

@Entity('position')
export class PositionEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  category_id: string;
}
