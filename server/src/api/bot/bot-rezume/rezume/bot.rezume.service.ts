import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { I18nService } from '../../../../i18n/i18n.service';
import { UserService } from 'src/api/user/user.service';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import { JobCategoriesService } from 'src/api/job-categories/job-categories.service';
import { MyLogger } from 'src/logger/logger.service';
import { Language } from 'src/common/enums';
// import { Category_Interface } from '../common/interfaces';
import { Context } from 'telegraf';

@Injectable()
export class BotRezumeService {
  private userStates = new Map<string, any>();

  constructor(
    private i18nService: I18nService,
    private userService: UserService,
    private jobPostsService: JobPostsService,
    private categoryService: JobCategoriesService,
    private logger: MyLogger,
  ) {}

  getUserState(id: string) {
    return this.userStates.get(id);
  }

  setUserState(id: string, state: any) {
    this.userStates.set(id, state);
  }

  deleteUserState(id: string) {
    this.userStates.delete(id);
  }

  // Savollarni olish
  getQuestions(lang: Language): string[] {
    return this.i18nService.getQuestions(lang, 'rezume');
  }

  // Keyboardlarni olish
  getKeyboard(lang: Language, type: string): any {
    return this.i18nService.getKeyboard(lang, type);
  }

  // Validatsiya funksiyasi
  validatePhoneNumber(phone: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!phone) {
      return {
        isValid: false,
        message: 'errors.required',
      };
    }

    // Formatlash funksiyasidan foydalanib telefonni formatlaymiz
    const formatted = this.formatPhoneNumber(phone);

    // Faqat raqamlarni olamiz
    const numbersOnly = formatted.replace(/\D/g, '');

    // 998 + 9 ta raqam = 12 ta raqam bo'lishi kerak
    if (numbersOnly.length !== 12) {
      return {
        isValid: false,
        message: 'errors.phone_invalid',
      };
    }

    if (!numbersOnly.startsWith('998')) {
      return {
        isValid: false,
        message: 'errors.phone_invalid',
      };
    }

    return { isValid: true };
  }

  // Formatlash funksiyasi
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    // Agar 998 bilan boshlansa va uzunligi 12 bo'lsa (998 + 9 ta raqam)
    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    // Agar 998 bilan boshlansa va uzunligi 9 bo'lsa (998 + 9 ta raqam)
    if (cleaned.startsWith('998') && cleaned.length === 9) {
      return `+998${cleaned}`;
    }

    // Agar faqat 9 ta raqam bo'lsa (998 ni qo'shish kerak)
    if (cleaned.length === 9 && !cleaned.startsWith('998')) {
      return `+998${cleaned}`;
    }

    // Agar +998 bilan boshlansa va 13 ta belgi bo'lsa (+998 + 9 ta raqam)
    if (phone.startsWith('+998') && phone.replace(/\D/g, '').length === 12) {
      return phone;
    }

    // Agar 0 bilan boshlanadigan 13 ta raqam bo'lsa
    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    return phone;
  }

  // Start collection
  async startCollection(chatId: string, lang: Language): Promise<string> {
    this.userStates.set(chatId, {
      step: 1,
      answers: {},
      awaitingLanguageText: false,
      gender: null,
      lang: lang,
    });

    const questions = this.getQuestions(lang);
    return questions[0];
  }

  // Handle user answer
  async handleUserAnswer(chatId: string, msg: any, ctx: Context): Promise<any> {
    const state = this.userStates.get(chatId);
    if (!state) return null;

    const step = state.step;
    let lang: Language = Language.UZ;
    if (state.lang === 'en') {
      lang = Language.EN;
    }
    if (state.lang === 'ru') {
      lang = Language.RU;
    }

    const questions = this.getQuestions(lang);

    // STEP 1 - Profession (Kasb tanlash)
    if (step === 1) {
      if ('text' in msg && msg.text) {
        const text = msg.text.trim();
        const translation = this.i18nService.getTranslation(lang);
        const categories = translation.category?.categories || [];

        // === 1. ORQAGA TUGMASI ===
        if (text === translation.category?.back) {
          if (state.selectedCategory) {
            delete state.selectedCategory;
            return {
              message: 'Kasbingizni tanlang:',
              keyboard: this.i18nService.getCategoryKeyboard(lang),
            };
          } else {
            this.userStates.delete(chatId);
            return {
              message: 'Asosiy menyuga qaytdingiz',
              keyboard: this.getKeyboard(lang, 'main'),
            };
          }
        }

        // === 2. KATEGORIYA TANLASH (AVVAL TEKSHIRISH) ===
        const category = categories.find((cat: any) => cat.name === text);
        if (category) {
          state.selectedCategory = category.name;

          this.userStates.set(chatId, state); // State ni saqlash
          return {
            message: `${category.name} kategoriyasidan pastagi mutaxassislikni tanlang:`,
            keyboard: this.i18nService.getSubCategoryKeyboard(
              lang,
              category.name,
            ),
          };
        }

        // === 3. SUBKATEGORIYA TANLASH (KEYIN TEKSHIRISH) ===
        // Faqat agar kategoriya tanlangan bo'lsa
        if (state.selectedCategory) {
          const currentCategory = categories.find(
            (cat: any) => cat.name === state.selectedCategory,
          );

          if (
            currentCategory &&
            currentCategory.sub_categories &&
            currentCategory.sub_categories.includes(text)
          ) {
            state.answers[1] = text; // Kasbni saqlash
            state.answers.category = state.selectedCategory; // Kategoriyani saqlash
            state.step = 2; // 2-qadamga o'tish
            delete state.selectedCategory; // Vaqtinchalik holatni tozalash

            this.userStates.set(chatId, state); // State ni saqlash

            const questions = this.getQuestions(lang);

            return {
              message: questions[1], // "PDF yuboring"
              keyboard: { remove_keyboard: true },
            };
          }
        }

        // === 4. AGAR HECH QAYSI BUTTON TANLANMASA ===
        // Kategoriya buttonlarini chiqarish

        // Agar kategoriya tanlanmagan bo'lsa, kategoriya buttonlarini chiqarish
        if (!state.selectedCategory) {
          return {
            message: 'Iltimos, kasbingizni quyidagi kategoriyalardan tanlang:',
            keyboard: this.i18nService.getCategoryKeyboard(lang),
          };
        } else {
          // Agar kategoriya tanlangan, lekin subkategoriya noto'g'ri bo'lsa
          return {
            message: `Iltimos, "${state.selectedCategory}" kategoriyasidan pastagi mutaxassislikni tanlang:`,
            keyboard: this.i18nService.getSubCategoryKeyboard(
              lang,
              state.selectedCategory,
            ),
          };
        }
      }
    }

    // STEP 2 - PDF
    if (step === 2) {
      if (!msg.document) {
        return { message: 'errors.pdf_required' };
      }

      const fileName = msg.document.file_name?.toLowerCase() || '';
      const mimeType = msg.document.mime_type || '';

      if (!fileName.endsWith('.pdf') && mimeType !== 'application/pdf') {
        return { message: 'errors.pdf_required' };
      }

      state.answers[2] = 'PDF qabul qilindi';
      state.step = 3;
      return { message: questions[2] };
    }

    // STEP 3 - Experience
    if (step === 3) {
      if ('text' in msg && msg.text) {
        state.answers[3] = msg.text;
        state.step = 4;
        return { message: questions[3] };
      }
    }

    // STEP 4 - Salary
    if (step === 4) {
      if ('text' in msg && msg.text) {
        state.answers[4] = msg.text;
        state.step = 5;
        return { message: questions[4] };
      }
    }

    // STEP 5 - Name
    if (step === 5) {
      if ('text' in msg && msg.text) {
        state.answers[5] = msg.text;
        state.step = 6;
        return { message: questions[5] };
      }
    }

    // STEP 6 - Age
    if (step === 6) {
      if ('text' in msg && msg.text) {
        state.answers[6] = msg.text;
        state.step = 7;
        return {
          message: questions[6],
          keyboard: this.getKeyboard(lang, 'gender'),
        };
      }
    }

    // STEP 7 - Gender
    if (step === 7) {
      if ('text' in msg && msg.text) {
        const genderText = msg.text;
        const genderOptions = this.getKeyboard(lang, 'gender').keyboard[0];

        if (genderOptions.includes(genderText)) {
          state.answers[7] = genderText;
          state.gender =
            genderText === this.i18nService.t(lang, 'gender.female')
              ? 'female'
              : 'male';
          state.step = 8;
          return {
            message: questions[7],
            keyboard: this.getKeyboard(lang, 'regions'),
          };
        } else {
          return {
            message: 'errors.gender_invalid',
            keyboard: this.getKeyboard(lang, 'gender'),
          };
        }
      }
    }

    // STEP 8 - Region
    if (step === 8) {
      if ('text' in msg && msg.text) {
        const region = msg.text;
        const regions = this.getKeyboard(lang, 'regions').keyboard.flat();

        if (regions.includes(region)) {
          state.answers[8] = region;
          state.step = 9;
          return {
            message: questions[8],
            keyboard: this.getKeyboard(lang, 'languages'),
          };
        } else {
          return {
            message: 'errors.region_invalid',
            keyboard: this.getKeyboard(lang, 'regions'),
          };
        }
      }
    }

    // STEP 9 - Languages
    // Bitta tilni 2 marta tanlasa 2 chisidan keyin tahrirlash bo'lib qolyabdi shuni 1 ta tilni 2 marta tanlaydigan qilmaslik kerak agar 2 marta tanlasa 2 chisini tanlaganidan so'ng siz bu tilni tanlagansiz iltimos boshqa til tanlang desin
    if (step === 9) {
      if ('text' in msg && msg.text) {
        const text = msg.text.trim();

        if (!Array.isArray(state.answers[9])) {
          state.answers[9] = [];
        }

        // "Boshqa"/"Other" bosilsa
        if (text === this.i18nService.t(lang, 'languages.4')) {
          state.awaitingLanguageText = true;
          return { message: 'enter_new_value' };
        }

        // Boshqa til kiritilsa
        if (state.awaitingLanguageText && text) {
          // Bu til allaqachon mavjudligini tekshirish
          if (state.answers[9].includes(text)) {
            state.awaitingLanguageText = false;
            return {
              message: 'errors.language_already_selected', // Yangi xabar qo'shish kerak
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          }

          state.answers[9].push(text);
          state.awaitingLanguageText = false;
          return {
            message: 'add_another',
            keyboard: this.getKeyboard(lang, 'languages'),
          };
        }

        // "Tanlashni yakunlash" bosilsa
        if (text === this.i18nService.t(lang, 'languages.5')) {
          if (state.answers[9].length === 0) {
            return {
              message: 'errors.language_invalid',
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          }
          state.step = 10;
          return { message: questions[9] };
        }

        // Ruyxatdan til tanlansa
        const validLanguages = this.getKeyboard(
          lang,
          'languages',
        ).keyboard.flat();

        if (validLanguages.includes(text)) {
          // Til allaqachon tanlanganligini tekshirish
          if (state.answers[9].includes(text)) {
            return {
              message: 'errors.language_already_selected', // "Siz bu tilni tanlagansiz, boshqa til tanlang"
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          } else {
            // Yangi tilni qo'shish
            state.answers[9].push(text);
            return {
              message: 'select_from_list',
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          }
        }

        return {
          message: 'errors.language_invalid',
          keyboard: this.getKeyboard(lang, 'languages'),
        };
      }
    }

    // STEP 10 - Portfolio
    if (step === 10) {
      if ('text' in msg && msg.text) {
        state.answers[10] = msg.text;
        state.step = 11;
        return { message: questions[10] };
      }
    }

    // STEP 11 - Skills
    if (step === 11) {
      if ('text' in msg && msg.text) {
        state.answers[11] = msg.text;
        state.step = 12;
        return {
          message: questions[11],
          keyboard: this.getKeyboard(lang, 'phone'),
        };
      }
    }

    // STEP 12 - Phone
    if (step === 12) {
      let phone = '';

      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      } else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        const validation = this.validatePhoneNumber(phone);
        if (!validation.isValid) {
          return {
            message: validation.message!,
            keyboard: this.getKeyboard(lang, 'phone'),
          };
        }

        state.answers[12] = this.formatPhoneNumber(phone);
        state.step = 13;
        return { message: questions[12] };
      }

      return {
        message: 'errors.phone_invalid',
        keyboard: this.getKeyboard(lang, 'phone'),
      };
    }

    // STEP 13 - Username
    if (step === 13) {
      if ('text' in msg && msg.text) {
        const username = msg.text.trim();

        if (!username.startsWith('@')) {
          return { message: 'Username xato' };
        }

        if (username.length < 2) {
          return { message: 'Username xato' };
        }

        state.answers[13] = username;

        this.setUserState(chatId, state);
        return {
          confirmation: true,
          answers: state.answers,
          gender: state.gender,
        };
      }
      return {
        message: questions[12],
        keyboard: { remove_keyboard: true },
      };
    }

    return null;
  }

  // Generate image
  private drawExtraBoldText(
    ctx: any,
    text: string,
    x: number,
    y: number,
    iterations = 2, // hozir 4 edi, 2 ga kamaytirdik
    offset = 1, // siljish pikselini boshqarish
  ) {
    const half = Math.floor(iterations / 2);
    for (let dx = -half; dx <= half; dx++) {
      for (let dy = -half; dy <= half; dy++) {
        ctx.fillText(text, x + dx * offset, y + dy * offset);
      }
    }
  }

  // ===== Generate image with extra bold effect =====
  async generateImage(data: any, gender?: string) {
    const uploadsDir = path.resolve(process.cwd(), '../', 'uploads');
    const assetsDir = path.resolve(process.cwd(), 'src', 'assets');
    if (!fs.existsSync(uploadsDir))
      fs.mkdirSync(uploadsDir, { recursive: true });

    const templatePath =
      gender === 'female'
        ? path.join(assetsDir, 'women_template.png')
        : path.join(assetsDir, 'template.png');

    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const name = data[5] || '';
    const age = data[6] || '';
    const job = data[1] || '';
    const salary = data[4] || '';
    const exp = data[3] || '';

    // --- Name & Age ---
    ctx.fillStyle = '#606060';
    ctx.font = 'bold 60px Sans';
    this.drawExtraBoldText(ctx, name, 450, 760);
    this.drawExtraBoldText(ctx, age + ' yosh', 1200, 760);

    // --- Job ---
    ctx.fillStyle = '#000';
    ctx.font = 'bold 120px Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = canvas.width / 2;
    const centerY = 1050;
    this.drawExtraBoldText(ctx, job, centerX, centerY);

    // --- Salary & Experience ---
    ctx.fillStyle = '#606060';
    ctx.font = 'bold 60px Sans';
    this.drawExtraBoldText(ctx, salary, 450, 1310);
    this.drawExtraBoldText(ctx, exp, 1200, 1300);

    // --- Save image ---
    const imgName = `output_${Date.now()}.png`;
    const fileName = path.join(uploadsDir, imgName);
    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise<void>((resolve) => out.on('finish', () => resolve()));

    // --- Caption ---
    const caption = `
▫️Kasbi: ${job}
▫️Tajribasi: ${exp}
▫️Maosh: ${salary}

▫️Ismi: ${name}
▫️Yoshi: ${age}
▫️Yashash joyi: ${data[8] || ''}

▫️Til bilimi: ${Array.isArray(data[9]) ? data[9].join(', ') : data[9] || ''}

Portfolio: ${data[10] || ''}
Ko'nikmalar: ${data[11] || ''}

Aloqa:
${data[12] || ''}
${data[13] || ''}

🪪 Rezyume joylash: @Reztal_post
`;

    return { imagePath: fileName, caption };
  }
}
