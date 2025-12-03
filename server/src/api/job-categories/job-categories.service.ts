import { Injectable } from '@nestjs/common';
import { CreateJobCategoryDto } from './dto/create-job-category.dto';
import { UpdateJobCategoryDto } from './dto/update-job-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import type { CategoryRepository } from 'src/core/repository/category.repository';

@Injectable()
export class JobCategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepository: CategoryRepository,
  ) {}
  create(createJobCategoryDto: CreateJobCategoryDto) {
    return 'This action adds a new jobCategory';
  }

  findAll() {
    return `This action returns all jobCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} jobCategory`;
  }

  update(id: number, updateJobCategoryDto: UpdateJobCategoryDto) {
    return `This action updates a #${id} jobCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} jobCategory`;
  }
}
