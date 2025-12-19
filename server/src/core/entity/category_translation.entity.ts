import { BaseEntity } from 'src/common/database/BaseEntity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { Language } from 'src/common/enums';

@Entity('category_translations')
export class CategoryTranslationEntity extends BaseEntity {
  @Column({ type: 'enum', enum: Language })
  lang: Language;

  @Column({ type: 'varchar' })
  name: string;

  @ManyToOne(() => CategoryEntity, (c) => c.translations, {
    onDelete: 'CASCADE',
  })
  category: CategoryEntity;
}
