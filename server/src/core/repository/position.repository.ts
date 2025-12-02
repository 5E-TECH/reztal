import { Repository } from 'typeorm';
import { PositionEntity } from '../entity/position.entity';

export type PositionRepository = Repository<PositionEntity>;
