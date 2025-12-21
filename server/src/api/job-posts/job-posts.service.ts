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
import { BotAdminService } from '../bot/bot-admin/bot.admin.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import config from 'src/config';
import { JobPostsTelegramService } from '../job-posts-telegram/job-posts-telegram.service';

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
    private readonly botAdminService: BotAdminService,
    private readonly jobPostsTelegramService: JobPostsTelegramService,
    @InjectBot() private readonly bot: Telegraf,
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
      const users = await this.userRepo.find({
        where: { telegram_id },
      });

      if (!users.length) {
        throw new NotFoundException('User with this telegram id not found');
      }

      const userIds = users.map((u) => u.id);

      const posts = await this.jobPostRepo.find({
        where: {
          user_id: In(userIds),
          post_status: In([Post_Status.PENDING, Post_Status.APPROVED]),
        },
        relations: ['subCategory', 'subCategory.translations', 'user'],
        order: { created_at: 'DESC' },
      });

      return successRes(posts, 200, 'All posts by user telegram id');
    } catch (error) {
      return catchError(error);
    }
  }

  async workFilter(
    filter: JobFilterDto,
    lang: Language,
    type: Post_Type = Post_Type.VACANCY,
  ) {
    try {
      let { page, sub_category, location } = filter;
      let { work_format, level } = filter;

      // ✅ Pagination tekshiruvi
      if (!page || page < 1) {
        page = 1;
      }

      const limit = 1;
      const skip = (page - 1) * limit;

      console.log('LANGUAGE: ', lang);
      console.log('CURRENT PAGE: ', page);

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
        )
        .where('job.type = :type', { type });

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

      // ✅ Tartiblash (masalan, yangilari birinchi)
      queryBuilder.orderBy('job.created_at', 'DESC');

      // Pagination
      queryBuilder.skip(skip).take(limit);

      // Natijalarni olish
      const [jobs, total] = await queryBuilder.getManyAndCount();

      console.log(`Natija: ${jobs.length} ta, Total: ${total}, Page: ${page}`);

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

  async incrementViewCount(id: string): Promise<number> {
    const jobPost =
      (await this.jobPostRepo.findOne({
        where: { post_id: id },
      })) ||
      (await this.jobPostRepo.findOne({
        where: { id },
      }));

    if (!jobPost) return 0;

    jobPost.view_count = Number(jobPost.view_count) + 1;
    await this.jobPostRepo.save(jobPost);

    return jobPost.view_count;
  }

  private buildRedirectUrl(postId: string, target?: 'portfolio') {
    const redirectHost =
      config.PROD_HOST || config.HOST_URL || 'https://t.me/Reztalpost';
    const safeRedirectHost = redirectHost.startsWith('http://')
      ? redirectHost.replace('http://', 'https://')
      : redirectHost.startsWith('https://')
        ? redirectHost
        : `https://${redirectHost}`;
    const API_PREFIX = 'api/v1';
    const base = `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${postId}`;
    return target ? `${base}?target=${target}` : base;
  }

  private isValidUrl(url?: string | null) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async redirectToJobPost(id: string, res, target?: string) {
    // Always bump views first
    const newViewCount = await this.incrementViewCount(id);

    // Fetch post and build contact target
    const post = await this.findByPostId(id);
    const hasPortfolio = post ? this.isValidUrl(post.portfolio) : false;
    const contactUrl = post
      ? target === 'portfolio' && hasPortfolio
        ? post.portfolio
        : this.botAdminService.generateContactUrl(
            post.telegram_username,
            post.user.phone_number,
          )
      : 'https://t.me/Reztalpost';

    // Use 302 redirect plus HTML fallback to ensure Telegram in-app browser opens the profile
    // Also refresh inline keyboard view counter in channel (best-effort)
    if (post) {
      try {
        const channelMessage =
          await this.jobPostsTelegramService.findChannelMessageByPostId(
            post.id,
          );
        const redirectKey = post.post_id || post.id;
        const redirectUrl = this.buildRedirectUrl(redirectKey);
        const portfolioRedirectUrl = hasPortfolio
          ? this.buildRedirectUrl(redirectKey, 'portfolio')
          : null;

        if (channelMessage) {
          await this.bot.telegram.editMessageReplyMarkup(
            channelMessage.chat_id,
            Number(channelMessage.message_id),
            undefined,
            {
              inline_keyboard: [
                [
                  {
                    text: `👁️ Ko'rildi: ${newViewCount}`,
                    callback_data: `views_${redirectKey}`,
                  },
                ],
                [
                  { text: '📞 Aloqaga chiqish', url: redirectUrl },
                  ...(portfolioRedirectUrl
                    ? [{ text: '🗂 Portfolio', url: portfolioRedirectUrl }]
                    : []),
                ],
              ],
            },
          );
        }
      } catch (err) {
        console.error('Failed to update channel keyboard view count', err);
      }
    }

    return res
      .status(302)
      .setHeader('Location', contactUrl)
      .send(
        `<html><head><meta http-equiv="refresh" content="0;url=${contactUrl}"/></head><body><a href="${contactUrl}">Redirecting...</a></body></html>`,
      );
  }

  async findByPostId(id: string) {
    let post = await this.jobPostRepo.findOne({
      where: { post_id: id },
      relations: ['user'],
    });

    if (!post) {
      post = await this.jobPostRepo.findOne({
        where: { id },
        relations: ['user'],
      });
    }

    return post;
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
