import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { catchError, successRes } from 'src/infrastructure/response';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import type { JobPostsRepository } from 'src/core/repository/job-posts.repository';
import { Language, Post_Status, Post_Type } from 'src/common/enums';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';
import type { SubCategoryTranslationRepository } from 'src/core/repository/sub_category_translation.repository';
import { MyPostsDto } from './dto/my-posts.dto';
import { UserEntity } from 'src/core/entity/user.entity';
import type { UserRepository } from 'src/core/repository/user.repository';
import { DataSource, In } from 'typeorm';
import { JobFilterDto } from './dto/job-filter.dto';
import { CreateVacancyDto } from './dto/create-vacancy.dto';

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

  async workFilter(filter: JobFilterDto, lang: Language) {
    try {
      const { page, sub_category, location } = filter;
      let { work_format, level } = filter;
      const limit = 5;
      const skip = (page - 1) * limit;

      console.log('LANGUAGE: ', lang);

      const subCategoryId = await this.subCatTraRepo.findOne({
        where: { name: sub_category },
        relations: ['subCategory'],
        select: ['id', 'name', 'subCategory'],
      });

      const queryBuilder = this.jobPostRepo
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.subCategory', 'subCategory')
        .leftJoinAndSelect('job.user', 'user')
        .leftJoinAndSelect(
          'subCategory.translations',
          'subCategoryTranslations',
          'subCategoryTranslations.lang = :lang',
          { lang },
        );

      // Filterlarni qo'llash
      if (subCategoryId) {
        queryBuilder.andWhere('job.sub_category_id = :sub_category_id', {
          sub_category_id: subCategoryId.subCategory.id,
        });
      }

      if (work_format) {
        work_format = work_format.toLowerCase();
        queryBuilder.andWhere('job.work_format = :work_format', {
          work_format,
        });
      }

      if (level) {
        level = level.toLowerCase();
        queryBuilder.andWhere('job.level = :level', { level });
      }

      if (location) {
        queryBuilder.andWhere('job.address = :location', { location });
      }

      // Pagination
      queryBuilder.skip(skip).take(limit);

      // Natijalarni olish
      const [jobs, total] = await queryBuilder.getManyAndCount();
      console.log('Natija: ', jobs[0].subCategory.translations);
      console.log('Natija: ', jobs[0].user);

      return successRes(
        {
          data: jobs,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        201,
        'Filtered vacancies',
      );
    } catch (error) {
      console.log(error);

      return catchError(error);
    }
  }

  async createVacancy(createVacancyDto: CreateVacancyDto) {
    try {
      const {
        image_path,
        level,
        salary,
        skills,
        sub_category,
        telegram_username,
        user_id,
        work_format,
        address,
      } = createVacancyDto;

      const subCategoryId = await this.subCatTraRepo.findOne({
        where: { name: sub_category },
        relations: ['subCategory'],
        select: ['id', 'name', 'subCategory'],
      });

      if (!subCategoryId || !subCategoryId.subCategory.id) {
        throw new NotFoundException('Sub category not found');
      }

      const newVacancy = this.jobPostRepo.create({
        sub_category_id: subCategoryId.subCategory.id,
        level,
        work_format,
        skills,
        salary,
        address,
        telegram_username,
        user_id,
        image_path,
        type: Post_Type.VACANCY,
        post_status: Post_Status.PENDING,
      });

      await this.jobPostRepo.save(newVacancy);

      return successRes(newVacancy, 201, 'New Vacancy created');
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
