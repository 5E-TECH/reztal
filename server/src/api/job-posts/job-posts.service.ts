import { Injectable } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { catchError, successRes } from 'src/infrastructure/response';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import type { JobPostsRepository } from 'src/core/repository/job-posts.repository';
import { Post_Status, Post_Type } from 'src/common/enums';

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPostsEntity)
    private readonly jobPostRepo: JobPostsRepository,
  ) {}
  async createResume(createResumeDto: CreateResumeDto) {
    try {
      const {
        address,
        age,
        experience,
        language,
        level,
        portfolio,
        salary,
        skills,
        sub_category_id,
        telegram_username,
        user_id,
        work_format,
      } = createResumeDto;

      const newResume = this.jobPostRepo.create({
        address,
        age,
        experience,
        language,
        level,
        portfolio,
        salary,
        skills,
        sub_category_id,
        telegram_username,
        user_id,
        work_format,
        post_status: Post_Status.PENDING,
        type: Post_Type.RESUME,
      });
      await this.jobPostRepo.save(newResume);

      return successRes(newResume, 201, 'New resume created');
    } catch (error) {
      return catchError(error);
    }
  }

  findAll() {
    return `This action returns all jobPosts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} jobPost`;
  }

  update(id: number, updateJobPostDto: UpdateJobPostDto) {
    return `This action updates a #${id} jobPost`;
  }

  remove(id: number) {
    return `This action removes a #${id} jobPost`;
  }
}
