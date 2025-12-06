import { Repository } from 'typeorm';
import { JobPostsTelegramEntity } from '../entity/job-posts-telegram.entity';

export type JobPostsTelegramRepository = Repository<JobPostsTelegramEntity>;
