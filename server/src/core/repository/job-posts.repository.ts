import { Repository } from 'typeorm';
import { JobPostsEntity } from '../entity/job-posts.entity';

export type JobPostsRepository = Repository<JobPostsEntity>;
