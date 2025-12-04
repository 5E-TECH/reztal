import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, OneToMany } from 'typeorm';
import { SubCategoryEntity } from './sub-category.entity';
import { CategoryTranslationEntity } from './category_translation.entity';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @OneToMany(() => CategoryTranslationEntity, (t) => t.category, {
    cascade: true,
  })
  translations: CategoryTranslationEntity[];

  @OneToMany(() => SubCategoryEntity, (position) => position.category)
  sub_categories: SubCategoryEntity[];
}
