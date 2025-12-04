import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { I18nService, Language } from '../../../i18n/i18n.service';

@Injectable()
export class BotRezumeService {
  private userStates = new Map<string, any>();

  constructor(private i18nService: I18nService) {}

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

    const cleaned = phone.replace(/\D/g, '');
    const numbersOnly = cleaned.startsWith('998')
      ? cleaned
      : cleaned.replace(/^\+?/, '');

    if (numbersOnly.length !== 13) {
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

    if (cleaned.startsWith('998') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    if (cleaned.startsWith('+998') && cleaned.length === 13) {
      return cleaned;
    }

    if (cleaned.length === 9) {
      return `+998${cleaned}`;
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
  async handleUserAnswer(chatId: string, msg: any): Promise<any> {
    const state = this.userStates.get(chatId);
    if (!state) return null;

    const step = state.step;
    const lang: Language = state.lang || 'uz';
    const questions = this.getQuestions(lang);

    // STEP 1 - Profession
    if (step === 1) {
      if ('text' in msg && msg.text) {
        state.answers[1] = msg.text;
        state.step = 2;
        return { message: questions[1] };
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
    if (step === 9) {
      if ('text' in msg && msg.text) {
        const text = msg.text;

        if (!Array.isArray(state.answers[9])) {
          state.answers[9] = [];
        }

        if (text === this.i18nService.t(lang, 'languages.4')) {
          // "Boshqa"/"Other"
          state.awaitingLanguageText = true;
          return { message: 'enter_new_value' };
        }

        if (state.awaitingLanguageText && text) {
          state.answers[9].push(text);
          state.awaitingLanguageText = false;
          return {
            message: 'add_another',
            keyboard: this.getKeyboard(lang, 'languages'),
          };
        }

        if (text === this.i18nService.t(lang, 'languages.5')) {
          // "Tanlashni yakunlash"
          if (state.answers[9].length === 0) {
            return {
              message: 'errors.language_invalid',
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          }

          state.step = 10;
          return { message: questions[9] };
        }

        const validLanguages = this.getKeyboard(
          lang,
          'languages',
        ).keyboard.flat();
        if (validLanguages.includes(text)) {
          if (state.answers[9].includes(text)) {
            state.answers[9] = state.answers[9].filter(
              (i: string) => i !== text,
            );
            return {
              message: 'edit_prompt',
              keyboard: this.getKeyboard(lang, 'languages'),
            };
          } else {
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
          return { message: 'errors.username_invalid' };
        }

        if (username.length < 2) {
          return { message: 'errors.username_invalid' };
        }

        state.answers[13] = username;

        return {
          confirmation: true,
          answers: state.answers,
          gender: state.gender,
        };
      }
    }

    return null;
  }

  // Generate image
  async generateImage(data: any, gender?: string) {
    const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const templatePath =
      gender === 'female'
        ? path.join(uploadsDir, 'women_template.png')
        : path.join(uploadsDir, 'template.png');

    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    const name = data[5] || '';
    const age = data[6] || '';
    const job = data[1] || '';
    const salary = data[4] || '';
    const exp = data[3] || '';

    ctx.fillStyle = '#606060';
    ctx.font = 'bold 40px Sans';
    ctx.fillText(name, 450, 780);
    ctx.fillText(age + ' yosh', 1200, 780);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 90px Sans';
    ctx.fillText(job, 700, 1050);

    ctx.fillStyle = '#606060';
    ctx.font = 'bold 40px Sans';
    ctx.fillText(salary, 450, 1320);
    ctx.fillText(exp, 1200, 1320);

    const fileName = path.join(uploadsDir, `output_${Date.now()}.png`);
    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    await new Promise<void>((resolve) => out.on('finish', () => resolve()));

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
