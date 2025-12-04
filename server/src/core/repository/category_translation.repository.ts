import { Repository } from 'typeorm';
import { CategoryTranslationEntity } from '../entity/category_translation.entity';

export type CategoryTranslationRepository =
  Repository<CategoryTranslationEntity>;
