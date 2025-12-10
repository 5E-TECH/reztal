import { name } from './../../../../../node_modules/ci-info/index.d';
import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { Language } from 'src/common/enums';
import { I18nService } from 'src/i18n/i18n.service';
import { text } from 'stream/consumers';
import { message } from 'telegraf/filters';
import { keyboard } from 'telegraf/markup';

@Injectable()
export class BotVacancyService {
  private employerStates = new Map<string, any>();

  constructor(private i18nService: I18nService) {}

  getEmployerState(id: string) {
    return this.employerStates.get(id);
  }

  setEmployerState(id: string, state: any) {
    this.employerStates.set(id, state);
  }

  deleteEmployerState(id: string) {
    this.employerStates.delete(id);
  }

  // Savollarni olish
  getQuestions(lang: Language): string[] {
    return this.i18nService.getQuestions(lang, 'vacancy');
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

    const cleaned = phone.replace(/\s/g, '');

    if (cleaned.length !== 13) {
      return {
        isValid: false,
        message: 'errors.phone_invalid',
      };
    }

    if (!cleaned.startsWith('+998')) {
      return {
        isValid: false,
        message: 'errors.phone_invalid',
      };
    }

    const phoneRegex = /^\+998\d{9}$/;
    if (!phoneRegex.test(cleaned)) {
      return {
        isValid: false,
        message: 'errors.phone_invalid',
      };
    }

    return { isValid: true };
  }

  // Telefonni formatlash
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    let cleaned = phone.replace(/\s/g, '');

    if (cleaned.startsWith('+998')) {
      return cleaned;
    }

    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    return cleaned;
  }

  // Start collection
  async startEmployerCollection(
    chatId: string,
    lang: Language,
  ): Promise<string> {
    this.employerStates.set(chatId, {
      step: 1,
      answers: {},
      type: 'employer',
      lang: lang,
    });

    const questions = this.getQuestions(lang);
    return questions[0];
  }

  // Handle employer answer
  async handleEmployerAnswer(chatId: string, msg: any) {
    const state = this.employerStates.get(chatId);
    if (!state) return null;

    const step = state.step;
    console.log('State step in service:', step);

    const lang: Language = Language.UZ;
    const questions = this.getQuestions(lang);
    console.log('Questions:', questions);

    if(step === 1) {
      if('text' in msg && msg.text) {
        const text = msg.text.trim();
        const translation = this.i18nService.getTranslation(lang);
        const categories = translation.category?.categories || [];

        if(text === translation.category?.back) {
          if(state.selectedCategory) {
            delete state.selectedCategory;
            return {
              message: 'Kasbingizni tanlang: ',
              keyboard: this.i18nService.getCategoryKeyboard(lang),
            }
          } else {
            this.employerStates.delete(chatId);
            return {
              message: 'Asosiy menyuga qaytdingiz',
              keyboard: this.getKeyboard(lang, 'main')
            }
          }
        }

        // === 2. Kategoriya tanlash (avval tekshirish) ===
        const category = categories.find((cat: any) => cat.name === text);
        if(category) {
          state.selectedCategory = category.name;

          this.employerStates.set(chatId, state);
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
        if(state.selectedCategory) {
          const currentCategory = categories.find((cat: any) => cat.name === state.selectedCategory);
          if (
            currentCategory &&
            currentCategory.sub_categories &&
            currentCategory.sub_categories.includes(text)
          ) {
            state.answers[1] = text; // Kasbni saqlash
            state.answers.category = state.selectedCategory; // Kategoriyani saqlash
            state.step = 2; // 2-qadamga o'tish
            delete state.selectedCategory; // Vaqtinchalik holatni tozalash

            this.employerStates.set(chatId, state); // State ni saqlash

            const questions = this.getQuestions(lang);

            return {
              message: questions[1], // "PDF yuboring"
              keyboard: { remove_keyboard: true },
            };
          }
        }

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

    // STEP 5-7 ni ham qo'shing (maosh, talablar, username)
    if (step >= 5 && step <= 7) {
      if ('text' in msg) {
        state.answers[step] = msg.text;
        state.step++;

        console.log('New step after 5-7:', state.step);

        // Agar 8-qadamga o'tilsa (telefon)
        if (state.step === 8) {
          return {
            message: questions[7], // 8. Telefon raqam?
            keyboard: this.getKeyboard(lang, 'phone'),
          };
        }

        // Keyingi savolni qaytarish
        return { message: questions[state.step - 1] };
      }
      return null;
    }

    // STEP 8 - Phone (special handling)
    if (step === 8) {
      let phone = '';

      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      } else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        const cleanedPhone = this.cleanPhoneNumber(phone);
        const validation = this.validatePhoneNumber(cleanedPhone);

        if (!validation.isValid) {
          return {
            message: validation.message!,
            keyboard: this.getKeyboard(lang, 'phone'),
          };
        }

        state.answers[8] = cleanedPhone;
        state.step = 9;

        return {
          confirmation: true,
          answers: state.answers,
        };
      }

      return {
        message: 'errors.phone_invalid',
        keyboard: this.getKeyboard(lang, 'phone'),
      };
    }

    // Step 1-4 uchun (oldingi kod)
    if ('text' in msg) {
      state.answers[step] = msg.text;
    } else {
      return null;
    }

    state.step++;

    // Special steps with keyboards
    if (state.step === 3) {
      return {
        message: questions[2], // 3. Hudud?
        keyboard: this.getKeyboard(lang, 'regions'),
      };
    }

    if (state.step === 4) {
      return {
        message: questions[3], // 4. Ish turi?
        keyboard: this.getKeyboard(lang, 'work_types'),
      };
    }

    // Completion
    if (state.step > questions.length) {
      return {
        confirmation: true,
        answers: state.answers,
      };
    }

    return { message: questions[state.step - 1] };
  }

  // Generate vacancy image
  async generateVacancyImage(data: any) {
    const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const templatePath = path.join(uploadsDir, 'employer_template.png');
    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    const job = data[1] || '';
    const company = data[2] || '';
    const region = data[3] || '';
    const workType = data[4] || '';
    const salary = data[5] || '';
    const requirements = data[6] || '';
    const username = data[7] || '';
    const phone = data[8] || '';

    ctx.fillStyle = '#000';
    ctx.font = 'bold 80px Sans';
    ctx.fillText(job, 700, 600);
    ctx.fillText(salary, 700, 1460);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 70px Sans';
    ctx.fillText(company, 480, 1080);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 60px Sans';
    ctx.fillText(region, 950, 1080);

    const fileName = path.join(uploadsDir, `employer_${Date.now()}.png`);
    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    await new Promise<void>((resolve) => out.on('finish', () => resolve()));

    const caption = `
💼 Kasb: ${job}
🏢 Kompaniya: ${company}
📍 Hudud: ${region}
🖥️ Ish turi: ${workType}
💰 Maosh: ${salary}
📋 Talablar: ${requirements}

👤 Telegram: ${username}

📞 Telefon: ${phone}

🪪 Vakansiya joylash: @Reztal_post
`;

    return { imagePath: fileName, caption };
  }
}
