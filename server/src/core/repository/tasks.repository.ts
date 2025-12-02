import { Repository } from 'typeorm';
import { TasksEntity } from '../entity/tasks.entity';

export type TasksRepository = Repository<TasksEntity>;
