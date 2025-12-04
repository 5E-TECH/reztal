import { Repository } from 'typeorm';
import { SubCategoryEntity } from '../entity/sub-category.entity';

export type SubCategoryRepository = Repository<SubCategoryEntity>;
