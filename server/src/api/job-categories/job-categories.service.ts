import { Injectable } from '@nestjs/common';
import { CreateJobCategoryDto } from './dto/create-job-category.dto';
import { UpdateJobCategoryDto } from './dto/update-job-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import type { CategoryRepository } from 'src/core/repository/category.repository';
import categoriesJson from '../../infrastructure/data/categories.json';
import { SubCategoryEntity } from 'src/core/entity/sub-category.entity';
import type { SubCategoryRepository } from 'src/core/repository/sub-category.repository';
import { Language } from 'src/common/enums';

@Injectable()
export class JobCategoriesService {
  constructor(
    @InjectRepository(SubCategoryEntity)
    private readonly subRepo: SubCategoryRepository,

    @InjectRepository(CategoryEntity)
    private categoryRepo: CategoryRepository,
  ) {}
  async onModuleInit() {
    try {
      const existCategories = await this.categoryRepo.find();

      if (existCategories.length === 0) {
        for (const cat of categoriesJson) {
          // Agar mavjud bo'lsa o'tkazib yuboramiz
          const exists = await this.categoryRepo.findOne({
            where: {
              translations: {
                name: cat.name.uz,
                lang: Language.UZ,
              },
            },
            relations: ['translations'],
          });

          if (exists) continue;

          const category = this.categoryRepo.create({
            translations: [
              { lang: Language.UZ, name: cat.name.uz },
              { lang: Language.RU, name: cat.name.ru },
              { lang: Language.EN, name: cat.name.en },
            ],
          });

          await this.categoryRepo.save(category);

          // subcategories
          for (const sub of cat.subCategories) {
            const subCategory = this.subRepo.create({
              category: category,
              translations: [
                { lang: Language.UZ, name: sub.uz },
                { lang: Language.RU, name: sub.ru },
                { lang: Language.EN, name: sub.en },
              ],
            });

            await this.subRepo.save(subCategory);
          }
        }
      }
    } catch (error) {}
  }

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
