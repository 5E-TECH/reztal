import { name } from './../../../../../node_modules/ci-info/index.d';
import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import { Console } from 'console';
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

    cleaned = cleaned.replace('@', '')

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

    if (step === 1) {
      if ('text' in msg && msg.text) {
        const text = msg.text.trim();
        const translation = this.i18nService.getTranslation(lang);
        const categories = translation.category?.categories || [];

        if (text === translation.category?.back) {
          if (state.selectedCategory) {
            delete state.selectedCategory;
            return {
              message: this.i18nService.t(lang, 'prompts.select_category'),
              keyboard: this.i18nService.getCategoryKeyboard(lang),
            };
          } else {
            this.employerStates.delete(chatId);
            return {
              message: 'Asosiy menyuga qaytdingiz',
              keyboard: this.getKeyboard(lang, 'main'),
            };
          }
        }

        // === 2. Kategoriya tanlash (avval tekshirish) ===
        const category = categories.find((cat: any) => cat.name === text);
        if (category) {
          state.selectedCategory = category.name;

          this.employerStates.set(chatId, state);
          return {
            message: this.i18nService.t(lang, 'prompts.select_subcategory', {
              category: category.name,
            }),
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
            message: this.i18nService.t(lang, 'prompts.select_category'),
            keyboard: this.i18nService.getCategoryKeyboard(lang),
          };
        } else {
          // Agar kategoriya tanlangan, lekin subkategoriya noto'g'ri bo'lsa
          return {
            message: this.i18nService.t(lang, 'prompts.select_subcategory', {
              category: state.selectedCategory,
            }),
            keyboard: this.i18nService.getSubCategoryKeyboard(
              lang,
              state.selectedCategory,
            ),
          };
        }
      }
    }

    if (step === 2) {
      if ('text' in msg && msg.text) {
        state.answers[2] = msg.text;
        state.step = 3;
        return {
          message: questions[2], // 4. Ish turi?
          keyboard: this.getKeyboard(lang, 'work_types'),
        };
      }
    }

    if (step === 3) {
      if ('text' in msg && msg.text) {
        state.answers[3] = msg.text;
        state.step = 4;
        return {
          message: questions[3], // 4. Ish turi?
          keyboard: this.getKeyboard(lang, 'regions'),
        };
      }
    }

    if (step === 4) {
      if ('text' in msg && msg.text) {
        state.answers[4] = msg.text;
        state.step = 5;
        return {
          message: questions[4], // 4. Ish turi?
          keyboard: this.getKeyboard(lang, 'level'),
        };
      }
    }

    if (step === 5) {
      if ('text' in msg && msg.text) {
        state.answers[5] = msg.text;
        state.step = 6;
        return {
          message: questions[5], // 4. Ish turi?
        };
      }
    }

    if (step === 6) {
      if ('text' in msg && msg.text) {
        state.answers[6] = msg.text;
        state.step = 7;
        return {
          message: questions[6], // 4. Ish turi?
        };
      }
    }

    if (step === 7) {
      if ('text' in msg && msg.text) {
        state.answers[7] = msg.text;
        state.step = 8;
        return {
          message: questions[7],
          keyboard: this.getKeyboard(lang, 'phone'),
        };
      }
    }

    if (step === 8) {
      let phone = '';

      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
        console.log('Kontakt yuborildi:', phone);
      } else if ('text' in msg && msg.text) {
        console.log('Text yuborildi:', msg.text);
        phone = msg.text.trim();
      }

      console.log('Original phone:', phone);
      const cleanedPhone = this.cleanPhoneNumber(phone);
      console.log('Cleaned phone:', cleanedPhone);

      if (phone) {
        const validation = this.validatePhoneNumber(phone);
        if (!validation.isValid) {
          return {
            message: validation.message!,
            keyboard: this.getKeyboard(lang, 'phone'),
          };
        }

        state.answers[8] = this.cleanPhoneNumber(phone);
        state.step = 9;
        return { message: questions[8] };
      }

      return {
        message: 'errors.phone_invalid',
        keyboard: this.getKeyboard(lang, 'phone'),
      };
    }

    if (step === 9) {
      if ('text' in msg && msg.text) {
        const username = msg.text.trim();

        if (!username.startsWith('@')) {
          return { message: 'errors.username_invalid' };
        }

        if (username.length < 2) {
          return { message: 'errors.username_invalid' };
        }

        state.answers[9] = username;

        this.setEmployerState(chatId, state);
        return {
          confirmation: true,
          answers: state.answers,
          gender: state.gender,
        };
      }
      return {
        message: questions[8],
        keyboard: { remove_keyboard: true },
      };
    }

    return null;
  }

  // Generate vacancy image
  async generateVacancyImage(data: any) {
    const uploadsDir = path.resolve(process.cwd(), '../', 'uploads');
    const assetsDir = path.resolve(process.cwd(), 'src', 'assets');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const templatePath = path.join(assetsDir, 'employer_template.png');
    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    const job = data[1] || '';
    const company = data[2] || '';
    const workType = data[3] || '';
    const region = data[4] || '';
    const level = data[5] || '';
    const requirements = data[6] || '';
    const salary = data[7] || '';
    const phone = data[8] || '';
    const username = data[9] || '';

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
🖥️ Ish turi: ${workType}
📍 Hudud: ${region}
Level: ${level}
💰 Maosh: ${salary}
📋 Talablar: ${requirements}

📞 Telefon: ${phone}
👤 Telegram: ${username}


🪪 Vakansiya joylash: @Reztal_post
`;

    return { imagePath: fileName, caption };
  }
}
