import { Repository } from 'typeorm';
import { SubCategoryTranslationEntity } from '../entity/sub_category_translation';

export type SubCategoryTranslationRepository =
  Repository<SubCategoryTranslationEntity>;
