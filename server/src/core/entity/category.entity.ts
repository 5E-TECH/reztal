import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity } from 'typeorm';

@Entity('category')
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;
}
