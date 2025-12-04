import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { I18nService, Language } from '../../../i18n/i18n.service';

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
    const lang: Language = state.lang || 'uz';
    const questions = this.getQuestions(lang);

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

    // Text answers
    if ('text' in msg) {
      state.answers[step] = msg.text;
    } else {
      return null;
    }

    state.step++;

    // Special steps with keyboards
    if (state.step === 3) {
      return {
        message: questions[2],
        keyboard: this.getKeyboard(lang, 'regions'),
      };
    }

    if (state.step === 4) {
      return {
        message: questions[3],
        keyboard: this.getKeyboard(lang, 'work_types'),
      };
    }

    if (state.step === 8) {
      return {
        message: questions[7],
        keyboard: this.getKeyboard(lang, 'phone'),
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
