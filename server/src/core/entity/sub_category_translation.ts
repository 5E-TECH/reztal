import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { SubCategoryEntity } from './sub-category.entity';
import { Language } from 'src/common/enums';

@Entity('sub_category_translations')
export class SubCategoryTranslationEntity extends BaseEntity {
  @Column({ type: 'enum', enum: Language })
  lang: Language;

  @Column({ type: 'varchar' })
  name: string;

  @ManyToOne(() => SubCategoryEntity, (s) => s.translations, {
    onDelete: 'CASCADE',
  })
  subCategory: SubCategoryEntity;
}
