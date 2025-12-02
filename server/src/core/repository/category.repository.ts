import { Repository } from 'typeorm';
import { CategoryEntity } from '../entity/category.entity';

export type CategoryRepository = Repository<CategoryEntity>;
