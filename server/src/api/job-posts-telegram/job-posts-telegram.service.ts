import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobPostsTelegramDto } from './dto/create-job-posts-telegram.dto';
import { UpdateJobPostsTelegramDto } from './dto/update-job-posts-telegram.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsEntity } from 'src/core/entity/job-posts.entity';
import type { JobPostsRepository } from 'src/core/repository/job-posts.repository';
import { catchError, successRes } from 'src/infrastructure/response';
import { JobPostsTelegramEntity } from 'src/core/entity/job-posts-telegram.entity';
import type { JobPostsTelegramRepository } from 'src/core/repository/job-posts-telegram.repository';
import config from 'src/config';
import { Chat_Type, Language, Post_Status } from 'src/common/enums';
import { DataSource } from 'typeorm';

@Injectable()
export class JobPostsTelegramService {
  constructor(
    @InjectRepository(JobPostsTelegramEntity)
    private readonly jobPostTelegRepo: JobPostsTelegramRepository,

    @InjectRepository(JobPostsEntity)
    private readonly jobPostsRepo: JobPostsRepository,

    private readonly dataSource: DataSource,
  ) {}
  async createPostForGroup(createPostTelegramDto: CreateJobPostsTelegramDto) {
    try {
      const { job_posts_id, message_id } = createPostTelegramDto;

      const isExistJobPosts = await this.jobPostsRepo.findOne({
        where: { id: job_posts_id },
      });
      if (!isExistJobPosts) {
        throw new NotFoundException('Job post not found');
      }

      const newPostTelegram = this.jobPostTelegRepo.create({
        chat_id: config.TELEGRAM_GROUP_ID,
        chat_type: Chat_Type.GROUP,
        job_posts_id,
        message_id,
      });
      await this.jobPostTelegRepo.save(newPostTelegram);

      return successRes({}, 201, 'Telegram post group created');
    } catch (error) {
      return catchError(error);
    }
  }

  async acceptPostOnGroup(
    updatePostDto: UpdateJobPostsTelegramDto,
    lang: Language,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { message_id } = updatePostDto;

      const group = await queryRunner.manager.findOne(JobPostsTelegramEntity, {
        where: { message_id, chat_type: Chat_Type.GROUP },
        relations: [
          'job_post',
          'job_post.subCategory',
          'job_post.subCategory.translations',
          'job_post.subCategory.category', // Add category relation
          'job_post.subCategory.category.translations', // Add category translations
        ],
      });

      if (!group) {
        throw new NotFoundException('Telegram group post not found');
      }

      console.log('REQUIRED ID: -----------', group.job_post.id);

      const test = await queryRunner.manager.findOne(JobPostsEntity, {
        where: {
          id: group.job_post.id,
        },
      });

      console.log('TEST -------------: ', test);

      // Fetch post without hard status filter to avoid false negatives
      const post = await queryRunner.manager.findOne(JobPostsEntity, {
        where: { id: group.job_post.id },
        relations: [
          'user',
          'subCategory',
          'subCategory.translations',
          'subCategory.category',
          'subCategory.category.translations',
        ],
      });

      console.log('POST: ...............: ', post);

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Always set approved to normalize status (even if already approved)
      if (post.post_status !== Post_Status.APPROVED) {
        post.post_status = Post_Status.APPROVED;
        await queryRunner.manager.save(post);
      }

      // Create response with filtered translations by language
      const filteredPost = {
        ...post,
        subCategory: post.subCategory
          ? {
              ...post.subCategory,
              // Filter translations by selected language
              translations:
                post.subCategory.translations?.filter((t) => t.lang === lang) ||
                [],
              // Get category with filtered translations
              category: post.subCategory.category
                ? {
                    ...post.subCategory.category,
                    translations:
                      post.subCategory.category.translations?.filter(
                        (t) => t.lang === lang,
                      ) || [],
                  }
                : null,
            }
          : null,
      };

      await queryRunner.commitTransaction();
      return successRes(filteredPost, 200, 'Post accepted successfully');
    } catch (error) {
      console.log('Xatolik bor', error);
      await queryRunner.rollbackTransaction();
      return catchError(error);
    } finally {
      await queryRunner.release();
    }
  }

  async getPostByMessageId(dto: UpdateJobPostsTelegramDto) {
    try {
      const { message_id } = dto;
      console.log('Message in JobPosts', message_id);

      const jobPostTelegram = await this.jobPostTelegRepo.findOne({
        where: { message_id, chat_type: Chat_Type.GROUP },
        relations: ['job_post'],
      });
      if (!jobPostTelegram) {
        throw new NotFoundException('Job post telegram not found');
      }

      return successRes(jobPostTelegram, 200, 'Job post telegram found');
    } catch (error) {
      return catchError(error);
    }
  }

  async createPostForChannel(createPostTelegramDto: CreateJobPostsTelegramDto) {
    try {
      const { job_posts_id, message_id } = createPostTelegramDto;
      const isExistJobPosts = await this.jobPostsRepo.findOne({
        where: { id: job_posts_id },
      });
      if (!isExistJobPosts) {
        throw new NotFoundException('Job post not found');
      }

      const newPostTelegram = this.jobPostTelegRepo.create({
        chat_id: config.TELEGRAM_CHANNEL_ID,
        chat_type: Chat_Type.CHANNEL,
        job_posts_id,
        message_id,
      });
      await this.jobPostTelegRepo.save(newPostTelegram);

      return successRes({}, 201, 'Telegram post channel created');
    } catch (error) {
      return catchError(error);
    }
  }

  async findChannelMessageByPostId(job_posts_id: string) {
    return this.jobPostTelegRepo.findOne({
      where: { job_posts_id, chat_type: Chat_Type.CHANNEL },
    });
  }

  create(createJobPostsTelegramDto: CreateJobPostsTelegramDto) {
    return 'This action adds a new jobPostsTelegram';
  }

  findAll() {
    return `This action returns all jobPostsTelegram`;
  }

  findOne(id: number) {
    return `This action returns a #${id} jobPostsTelegram`;
  }

  update(id: number, updateJobPostsTelegramDto: UpdateJobPostsTelegramDto) {
    return `This action updates a #${id} jobPostsTelegram`;
  }

  remove(id: number) {
    return `This action removes a #${id} jobPostsTelegram`;
  }
}
