import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { catchError, successRes } from 'src/infrastructure/response';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import type { JobPostsRepository } from 'src/core/repository/job-posts.repository';
import { Post_Status, Post_Type } from 'src/common/enums';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';
import type { SubCategoryTranslationRepository } from 'src/core/repository/sub_category_translation.repository';
import { UpdateJobPostsTelegramDto } from '../job-posts-telegram/dto/update-job-posts-telegram.dto';
import { MyPostsDto } from './dto/my-posts.dto';
import { UserEntity } from 'src/core/entity/user.entity';
import type { UserRepository } from 'src/core/repository/user.repository';
import { DataSource, In } from 'typeorm';

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPostsEntity)
    private readonly jobPostRepo: JobPostsRepository,

    @InjectRepository(SubCategoryTranslationEntity)
    private readonly subCatTraRepo: SubCategoryTranslationRepository,

    @InjectRepository(UserEntity)
    private readonly userRepo: UserRepository,

    private readonly dataSource: DataSource,
  ) {}
  async createResume(createResumeDto: CreateResumeDto) {
    try {
      const {
        address,
        age,
        experience,
        language,
        portfolio,
        salary,
        skills,
        sub_category,
        telegram_username,
        user_id,
        image_path,
      } = createResumeDto;

      const subCategoryId = await this.subCatTraRepo.findOne({
        where: { name: sub_category },
        relations: ['subCategory'],
        select: ['id', 'name', 'subCategory'],
      });

      console.log(subCategoryId);

      if (!subCategoryId) {
        throw new NotFoundException('Sub category not found');
      }

      const newResume = this.jobPostRepo.create({
        address,
        age,
        experience,
        language,
        portfolio,
        salary,
        skills,
        sub_category_id: subCategoryId.subCategory.id,
        telegram_username,
        user_id,
        post_status: Post_Status.PENDING,
        type: Post_Type.RESUME,
        image_path,
      });
      await this.jobPostRepo.save(newResume);

      return successRes(newResume, 201, 'New resume created');
    } catch (error) {
      return catchError(error);
    }
  }

  async getMyPosts(dto: MyPostsDto) {
    try {
      const { telegram_id } = dto;
      const user = await this.userRepo.findOne({
        where: { telegram_id },
      });
      if (!user) {
        throw new NotFoundException('User with this telegram id not found');
      }
      const posts = await this.jobPostRepo.find({
        where: {
          user_id: user.id,
          post_status: In([Post_Status.PENDING, Post_Status.APPROVED]),
        },
      });

      return successRes(posts, 200, 'All posts by user telegram id');
    } catch (error) {
      return catchError(error);
    }
  }

  // async findFilteredWithPagination

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
