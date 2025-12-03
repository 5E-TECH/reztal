import { Injectable } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { catchError } from 'src/infrastructure/response';

@Injectable()
export class JobPostsService {
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
