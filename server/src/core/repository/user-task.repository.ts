import { Repository } from 'typeorm';
import { UserTaskEntity } from '../entity/user-task.entity';

export type UserTaskRepository = Repository<UserTaskEntity>;
