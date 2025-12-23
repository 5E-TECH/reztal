import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { catchError, successRes } from 'src/infrastructure/response';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import type { JobPostsRepository } from 'src/core/repository/job-posts.repository';
import {
  Language,
  Post_Status,
  Post_Type,
  Work_Format,
  Level,
} from 'src/common/enums';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';
import type { SubCategoryTranslationRepository } from 'src/core/repository/sub_category_translation.repository';
import { MyPostsDto } from './dto/my-posts.dto';
import { UserEntity } from 'src/core/entity/user.entity';
import type { UserRepository } from 'src/core/repository/user.repository';
import { DataSource, In, DeepPartial } from 'typeorm';
import { JobFilterDto } from './dto/job-filter.dto';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
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
    private readonly jobPostsTelegramService: JobPostsTelegramService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  /**
   * Resolve sub category id by a localized name.
   * Prefers the provided language, but falls back to any language match.
   */
  private async findSubCategoryId(
    name: string,
    lang?: Language,
  ): Promise<string | null> {
    if (!name) return null;

    const normalizedName = name.trim().toLowerCase();

    const baseQuery = this.subCatTraRepo
      .createQueryBuilder('translation')
      .leftJoinAndSelect('translation.subCategory', 'subCategory')
      .where('LOWER(translation.name) = :name', { name: normalizedName });

    if (lang) {
      baseQuery.andWhere('translation.lang = :lang', { lang });
    }

    let translation = await baseQuery.getOne();

    if (!translation && lang) {
      translation = await this.subCatTraRepo
        .createQueryBuilder('translation')
        .leftJoinAndSelect('translation.subCategory', 'subCategory')
        .where('LOWER(translation.name) = :name', { name: normalizedName })
        .getOne();
    }

    return translation?.subCategory?.id || null;
  }
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

      const subCategoryId = await this.findSubCategoryId(sub_category);

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
        sub_category_id: subCategoryId,
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
      let { page, sub_category } = filter;
      const location = (filter as any).location;
      let { work_format, level } = filter;

      // ✅ Pagination tekshiruvi
      if (!page || page < 1) {
        page = 1;
      }

      const limit = 1;
      const skip = (page - 1) * limit;

      console.log('LANGUAGE: ', lang);
      console.log('CURRENT PAGE: ', page);

      const subCategoryId = await this.findSubCategoryId(sub_category, lang);

    const queryBuilder = this.jobPostRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.subCategory', 'subCategory')
      .leftJoinAndSelect('job.user', 'user')
      .leftJoinAndSelect(
        'subCategory.translations',
        'subCategoryTranslations',
      )
      .where('job.type = :type', { type });
    // Faqat admin tomonidan tasdiqlangan postlar botdagi filterda ko'rinadi
    queryBuilder.andWhere('job.post_status = :status', {
      status: Post_Status.APPROVED,
    });

    // Filterlarni qo'llash
    if (subCategoryId) {
      queryBuilder.andWhere('job.sub_category_id = :sub_category_id', {
        sub_category_id: subCategoryId,
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
        if (Array.isArray(location)) {
          const locations = location.filter(Boolean);
          if (locations.length) {
            queryBuilder.andWhere('job.address IN (:...locations)', {
              locations,
            });
          }
        } else {
          queryBuilder.andWhere('job.address = :location', { location });
        }
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

      const subCategoryId = await this.findSubCategoryId(sub_category);

      if (!subCategoryId) {
        throw new NotFoundException('Sub category not found');
      }

      const newVacancy = this.jobPostRepo.create({
        sub_category_id: subCategoryId,
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

  /**
   * Update post status helper (used for admin reject flow).
   */
  async updatePostStatus(
    postId: string,
    status: Post_Status,
  ): Promise<JobPostsEntity | null> {
    const post = await this.findByPostId(postId);
    if (!post) return null;
    post.post_status = status;
    await this.jobPostRepo.save(post);
    return post;
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

  /**
   * Contact URL ustuvorligi: username > fallback channel
   */
  private generateContactUrl(
    tg_username?: string | null,
    phone_number?: string | null,
  ): string {
    if (tg_username && tg_username.trim()) {
      const username = tg_username.replace(/^@/, '').trim();
      return `https://t.me/${username}`;
    }
    return 'https://t.me/Reztalpost';
  }

  async redirectToJobPost(id: string, res: any, target?: string) {
    console.log('[REDIRECT] start', {
      id,
      target,
      hasRes: !!res,
      hasStatus: !!res?.status,
      hasSetHeader: !!res?.setHeader,
      resType: typeof res,
    });

    // If res is not a real HTTP response (e.g., called from bot context), just return updated view count and redirect URL
    const isHttpResponse =
      res && typeof res.status === 'function' && typeof res.setHeader === 'function';
    if (!isHttpResponse) {
      const newViewCount = await this.incrementViewCount(id);
      const post = await this.findByPostId(id);
      const redirectKey = post?.post_id || post?.id || id;
      const redirectUrl = this.buildRedirectUrl(redirectKey, target === 'portfolio' ? 'portfolio' : undefined);
      return successRes(
        {
          redirectUrl,
          view_count: newViewCount,
        },
        200,
        'Redirect info',
      );
    }

    // Always bump views first
    const newViewCount = await this.incrementViewCount(id);

    // Fetch post and build contact target
    const post: JobPostsEntity | null = await this.findByPostId(id);
    if (!post) {
      return res
        .status(404)
        .send('Not found');
    }

    const hasPortfolio = this.isValidUrl(post.portfolio);
    const contactUrl =
      target === 'portfolio' && hasPortfolio
        ? post.portfolio
        : this.generateContactUrl(
            post.telegram_username,
            post.user?.phone_number,
          );

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

  async findByPostId(
    id: string,
    withRelations = false,
  ): Promise<JobPostsEntity | null> {
    console.log('[FIND BY POST ID]', { id, withRelations });
    const isNumericId = /^\d+$/.test(String(id));
    let post: JobPostsEntity | null = null;

    const baseRelations = ['user'];
    const extraRelations = withRelations
      ? ['subCategory', 'subCategory.translations']
      : [];
    const relations = [...baseRelations, ...extraRelations];

    if (isNumericId) {
      post = await this.jobPostRepo.findOne({
        where: { post_id: id },
        relations,
      });
    }

    if (!post) {
      post = await this.jobPostRepo.findOne({
        where: { id },
        relations,
      });
    }

    return post;
  }

  /**
   * Soft delete a post: mark status as DELETED and remove channel message if exists.
   */
  async softDeletePost(postId: string) {
    const post = await this.findByPostId(postId);

    if (!post) {
      throw new NotFoundException('Job post not found');
    }

    if (post.post_status === Post_Status.DELETED) {
      return post;
    }

    post.post_status = Post_Status.DELETED;
    await this.jobPostRepo.save(post);

    try {
      const channelMessage =
        await this.jobPostsTelegramService.findChannelMessageByPostId(
          post.id,
        );
      if (channelMessage?.chat_id && channelMessage?.message_id) {
        await this.bot.telegram.deleteMessage(
          channelMessage.chat_id,
          Number(channelMessage.message_id),
        );
      }
    } catch (err: any) {
      // Ignore non-fatal Telegram delete errors (e.g., older messages)
      console.log(
        'Channel message delete skipped:',
        err?.description || err?.message || err,
      );
    }

    return post;
  }

  /**
   * Admin edit helper: update allowed fields on a post (and user phone if provided).
   */
  async updateAdminPost(
    postId: string,
    changes: {
      salary?: string;
      address?: string | null;
      work_format?: Work_Format;
      level?: Level;
      skills?: string;
      experience?: string;
      age?: string;
      language?: string;
      portfolio?: string;
      telegram_username?: string;
      phone_number?: string;
      company_name?: string;
      sub_category?: string;
      name?: string;
    },
  ) {
    const post = await this.findByPostId(postId);
    if (!post) throw new NotFoundException('Job post not found');

    const updateData: DeepPartial<JobPostsEntity> = {};

    if (changes.salary !== undefined) updateData.salary = changes.salary;
    if (changes.address !== undefined) updateData.address = changes.address;
    if (changes.work_format !== undefined)
      updateData.work_format = changes.work_format;
    if (changes.level !== undefined) updateData.level = changes.level;
    if (changes.skills !== undefined) updateData.skills = changes.skills;
    if (changes.experience !== undefined)
      updateData.experience = changes.experience;
    if (changes.age !== undefined) updateData.age = changes.age;
    if (changes.language !== undefined) updateData.language = changes.language;
    if (changes.portfolio !== undefined) updateData.portfolio = changes.portfolio;
    if (changes.telegram_username !== undefined)
      updateData.telegram_username = changes.telegram_username;
    if (changes.sub_category !== undefined) {
      const subId = await this.findSubCategoryId(changes.sub_category);
      if (subId) {
        updateData.sub_category_id = subId;
      }
    }

    if (Object.keys(updateData).length) {
      await this.jobPostRepo.update({ id: post.id }, updateData);
    }

    if (changes.phone_number !== undefined && post.user_id) {
      await this.userRepo.update(
        { id: post.user_id },
        { phone_number: changes.phone_number },
      );
    }

    if (changes.company_name !== undefined && post.user_id) {
      await this.userRepo.update(
        { id: post.user_id },
        { company_name: changes.company_name },
      );
    }

    if (changes.name !== undefined && post.user_id) {
      await this.userRepo.update({ id: post.user_id }, { name: changes.name });
    }

    return this.findByPostId(postId);
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
