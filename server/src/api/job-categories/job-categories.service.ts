import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoryEntity } from 'src/core/entity/category.entity';
import { SubCategoryEntity } from 'src/core/entity/sub-category.entity';
import { CategoryTranslationEntity } from 'src/core/entity/category_translation.entity';
import { SubCategoryTranslationEntity } from 'src/core/entity/sub_category_translation';
import type { CategoryRepository } from 'src/core/repository/category.repository';
import type { SubCategoryRepository } from 'src/core/repository/sub-category.repository';
import categoriesJson from '../../infrastructure/data/categories.json';
import { Language } from 'src/common/enums';
import { MyLogger } from 'src/logger/logger.service';

@Injectable()
export class JobCategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: CategoryRepository,

    @InjectRepository(SubCategoryEntity)
    private readonly subRepo: SubCategoryRepository,

    private readonly logger: MyLogger,
  ) {}

  async onModuleInit() {
    try {
      const existingCategories = await this.categoryRepo.find({
        relations: ['translations'],
      });

      this.logger.log(
        `Database contains ${existingCategories.length} categories:`,
      );

      for (const c of existingCategories) {
        const uzName = c.translations.find((t) => t.lang === Language.UZ)?.name;

        this.logger.log(` - ${uzName || '(no uz translation)'}`);
      }

      this.logger.log('Checking and creating missing categories...');

      for (const cat of categoriesJson) {
        // 1) UZ nomi bo‘yicha mavjud kategoriya qidiramiz
        const existing = await this.categoryRepo
          .createQueryBuilder('cat')
          .leftJoinAndSelect('cat.translations', 'trans')
          .where('trans.lang = :lang', { lang: Language.UZ })
          .andWhere('trans.name = :name', { name: cat.name.uz })
          .getOne();

        if (existing) {
          this.logger.log(`Category exists → SKIP: ${cat.name.uz}`);
          continue;
        }

        // 2) Category CREATE
        const category = this.categoryRepo.create({
          translations: [
            {
              lang: Language.UZ,
              name: cat.name.uz,
            } as CategoryTranslationEntity,
            {
              lang: Language.RU,
              name: cat.name.ru,
            } as CategoryTranslationEntity,
            {
              lang: Language.EN,
              name: cat.name.en,
            } as CategoryTranslationEntity,
          ],
        });

        const savedCategory = await this.categoryRepo.save(category);

        // 3) SubCategory CREATE
        for (const sub of cat.subCategories) {
          const subCategory = this.subRepo.create({
            category: savedCategory,
            translations: [
              {
                lang: Language.UZ,
                name: sub.uz,
              } as SubCategoryTranslationEntity,
              {
                lang: Language.RU,
                name: sub.ru,
              } as SubCategoryTranslationEntity,
              {
                lang: Language.EN,
                name: sub.en,
              } as SubCategoryTranslationEntity,
            ],
          });

          await this.subRepo.save(subCategory);
        }

        this.logger.log(`Created Category: ${cat.name.uz}`);
      }

      this.logger.log(
        'All missing categories and subcategories were successfully created.',
      );
    } catch (error) {
      this.logger.error('Job categories initialization failed', error);
    }
  }
}
