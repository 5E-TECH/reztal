import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, OneToMany } from 'typeorm';
import { SubCategoryEntity } from './sub-category.entity';

@Entity('category')
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => SubCategoryEntity, (position) => position.category)
  sub_categories: SubCategoryEntity[];
}
