import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService {
  private userStates = new Map<string, any>();

  getUserState(id: string) {
    return this.userStates.get(id);
  }

  setUserState(id: string, state: any) {
    this.userStates.set(id, state);
  }

  deleteUserState(id: string) {
    this.userStates.delete(id);
  }

  // ===== KEYBOARDS =====
  genderKeyboard = {
    keyboard: [['Erkak', 'Ayol']],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  regionsKeyboard = {
    keyboard: [
      ['Toshkent shahri', 'Toshkent viloyati'],
      ['Andijon', "Farg'ona", 'Namangan'],
      ['Samarqand', 'Buxoro', 'Xorazm'],
      ['Qashqadaryo', 'Surxondaryo'],
      ['Jizzax', 'Sirdaryo', 'Navoiy'],
      ["Qoraqalpog'iston"],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  languageKeyboard = {
    keyboard: [
      ['O‘zbek', 'Rus'],
      ['Ingliz', 'Koreys'],
      ['Boshqa'],
      ['🟢 Tanlashni yakunlash'],
    ],
    resize_keyboard: true,
  };

  phoneKeyboard = {
    keyboard: [[{ text: '📞 Raqamni ulashish', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  // ===== TELEFON RAQAM VALIDATSIYASI =====
  public validatePhoneNumber(phone: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!phone) {
      return {
        isValid: false,
        message: '❗ Iltimos, telefon raqamingizni kiriting.',
      };
    }

    const cleaned = phone.replace(/\D/g, '');
    const numbersOnly = cleaned.startsWith('998')
      ? cleaned
      : cleaned.replace(/^\+?/, '');

    if (numbersOnly.length !== 12) {
      return {
        isValid: false,
        message:
          '❗ Iltimos, toʻgʻri Oʻzbekiston telefon raqamini kiriting (12 ta raqam).\n\n' +
          'Misol: +998901234567 yoki 998901234567\n' +
          'Contact yuborsangiz ham qabul qilinadi.',
      };
    }

    if (!numbersOnly.startsWith('998')) {
      return {
        isValid: false,
        message:
          '❗ Telefon raqami 998 bilan boshlanishi kerak.\n\n' +
          'Misol: +998901234567\n' +
          'Yoki: 998901234567',
      };
    }

    const operatorCode = numbersOnly.substring(3, 5);
    const validOperatorCodes = [
      '90',
      '91',
      '93',
      '94',
      '95',
      '97',
      '98',
      '99',
      '77',
      '88',
    ];

    if (!validOperatorCodes.includes(operatorCode)) {
      return {
        isValid: false,
        message:
          '❗ Notoʻgʻri operator kodi. Oʻzbekistonda quyidagi operatorlar mavjud:\n' +
          '• Ucell: 93, 94\n' +
          '• Beeline: 90, 91\n' +
          '• Uzmobile: 95\n' +
          '• Mobiuz: 97\n' +
          '• Perfectum: 98\n' +
          '• Humans: 33\n' +
          'Iltimos, toʻgʻri raqam kiriting.',
      };
    }

    return { isValid: true };
  }

  // ===== TELEFON RAQAMNI FORMATLASH =====
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

  // ===== QUESTIONS =====
  questions = [
    '1. Kasbingiz nima?',
    "2. Rezyumengizni PDF ko'rinishida yuboring.",
    '3. Tajribangiz qancha?',
    "4. Qancha maosh so'raysiz?",
    '5. Ismingiz?',
    '6. Yoshingiz?',
    '7. Jinsingizni tanlang:',
    '8. Yashash joyingizni tanlang:',
    '9. Til bilimingizni tanlang:',
    "10. Portfolio (agar bo'lsa)?",
    "11. Sohangizga aloqador ko'nikmalar?",
    '12. Telefon raqamingiz?',
    '13. Telegram username?',
  ];

  // ===== START STATE - TO'G'RILANGAN =====
  async startCollection(chatId: string): Promise<string> {
    this.userStates.set(chatId, {
      step: 1,
      answers: {},
      awaitingLanguageText: false,
      gender: null,
    });

    // Faqat birinchi savolni qaytarish kerak, object emas
    return this.questions[0];
  }

  // ===== MAIN LOGIC =====
  async handleUserAnswer(chatId: string, msg: any): Promise<any> {
    const state = this.userStates.get(chatId);
    if (!state) return null;

    const step = state.step;

    console.log('Current step:', step, 'Message:', msg);

    // === STEP 1 — KASB ===
    if (step === 1) {
      if ('text' in msg && msg.text) {
        state.answers[1] = msg.text;
        state.step = 2;
        this.setUserState(chatId, state);
        // Faqat xabar qaytarish
        return this.questions[1];
      }
    }

    // === STEP 2 — PDF ===
    if (step === 2) {
      if (!msg.document) {
        return '❗ Iltimos, rezyumeni PDF shaklda yuboring.';
      }

      const fileName = msg.document.file_name?.toLowerCase() || '';
      const mimeType = msg.document.mime_type || '';

      if (!fileName.endsWith('.pdf') && mimeType !== 'application/pdf') {
        return '❗ Iltimos, faqat PDF formatidagi rezyumeni yuboring.';
      }

      state.answers[2] = 'PDF qabul qilindi';
      state.step = 3;
      this.setUserState(chatId, state);
      return this.questions[2];
    }

    // === STEP 3 — TAJRIBA ===
    if (step === 3) {
      if ('text' in msg && msg.text) {
        state.answers[3] = msg.text;
        state.step = 4;
        this.setUserState(chatId, state);
        return this.questions[3];
      }
    }

    // === STEP 4 — MAOSH ===
    if (step === 4) {
      if ('text' in msg && msg.text) {
        state.answers[4] = msg.text;
        state.step = 5;
        this.setUserState(chatId, state);
        return this.questions[4];
      }
    }

    // === STEP 5 — ISM ===
    if (step === 5) {
      if ('text' in msg && msg.text) {
        state.answers[5] = msg.text;
        state.step = 6;
        this.setUserState(chatId, state);
        return this.questions[5];
      }
    }

    // === STEP 6 — YOSH ===
    if (step === 6) {
      if ('text' in msg && msg.text) {
        state.answers[6] = msg.text;
        state.step = 7;
        this.setUserState(chatId, state);
        // Jins tanlash uchun keyboard bilan xabar qaytarish
        return {
          message: this.questions[6],
          keyboard: this.genderKeyboard,
        };
      }
    }

    // === STEP 7 — JINS ===
    if (step === 7) {
      if ('text' in msg && msg.text) {
        const genderText = msg.text;
        if (genderText === 'Erkak' || genderText === 'Ayol') {
          state.answers[7] = genderText;
          state.gender = genderText === 'Ayol' ? 'female' : 'male';
          state.step = 8;
          this.setUserState(chatId, state);
          return {
            message: this.questions[7],
            keyboard: this.regionsKeyboard,
          };
        } else {
          return {
            message: '❗ Iltimos, Erkak yoki Ayol tugmalaridan birini tanlang:',
            keyboard: this.genderKeyboard,
          };
        }
      }
      return {
        message: this.questions[6],
        keyboard: this.genderKeyboard,
      };
    }

    // === STEP 8 — HUDUD ===
    if (step === 8) {
      if ('text' in msg && msg.text) {
        const region = msg.text;
        const validRegions = this.regionsKeyboard.keyboard.flat();

        if (validRegions.includes(region)) {
          state.answers[8] = region;
          state.step = 9;
          this.setUserState(chatId, state);
          return {
            message: this.questions[8],
            keyboard: this.languageKeyboard,
          };
        } else {
          return {
            message: '❗ Iltimos, yashash joyingizni tugmalardan tanlang:',
            keyboard: this.regionsKeyboard,
          };
        }
      }
      return {
        message: this.questions[7],
        keyboard: this.regionsKeyboard,
      };
    }

    // === STEP 9 — TILLAR ===
    if (step === 9) {
      if ('text' in msg && msg.text) {
        const text = msg.text;

        if (!Array.isArray(state.answers[9])) {
          state.answers[9] = [];
        }

        if (text === 'Boshqa') {
          state.awaitingLanguageText = true;
          return 'Til nomini yozing:';
        }

        if (state.awaitingLanguageText && text) {
          state.answers[9].push(text);
          state.awaitingLanguageText = false;

          return {
            message: `Qo'shildi: ${text}\nYana til tanlang yoki "🟢 Tanlashni yakunlash" tugmasini bosing.`,
            keyboard: this.languageKeyboard,
          };
        }

        if (text === '🟢 Tanlashni yakunlash') {
          if (state.answers[9].length === 0) {
            return {
              message: '❗ Iltimos, kamida bitta tilni tanlang:',
              keyboard: this.languageKeyboard,
            };
          }

          state.step = 10;
          this.setUserState(chatId, state);
          return this.questions[9];
        }

        const validLanguages = this.languageKeyboard.keyboard.flat();
        if (validLanguages.includes(text)) {
          if (state.answers[9].includes(text)) {
            state.answers[9] = state.answers[9].filter(
              (i: string) => i !== text,
            );
            return {
              message: `O'chirildi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ') || "Yo'q"}`,
              keyboard: this.languageKeyboard,
            };
          } else {
            state.answers[9].push(text);
            return {
              message: `Tanlandi: ${text}\nTanlangan tillar: ${state.answers[9].join(', ')}`,
              keyboard: this.languageKeyboard,
            };
          }
        }

        return {
          message: '❗ Iltimos, tugmalardan foydalaning.',
          keyboard: this.languageKeyboard,
        };
      }

      return {
        message: this.questions[8],
        keyboard: this.languageKeyboard,
      };
    }

    // === STEP 10 — PORTFOLIO ===
    if (step === 10) {
      if ('text' in msg && msg.text) {
        state.answers[10] = msg.text;
        state.step = 11;
        this.setUserState(chatId, state);
        return this.questions[10];
      }
    }

    // === STEP 11 — KONIKMALAR ===
    if (step === 11) {
      if ('text' in msg && msg.text) {
        state.answers[11] = msg.text;
        state.step = 12;
        this.setUserState(chatId, state);
        // BU YERDA TELEFON RAQAM UCHUN TUGMA CHIQARAMIZ
        return {
          message: this.questions[11], // "12. Telefon raqamingiz?"
          keyboard: this.phoneKeyboard,
        };
      }
    }

    // === STEP 12 — TELEFON ===
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
            keyboard: this.phoneKeyboard,
          };
        }

        state.answers[12] = this.formatPhoneNumber(phone);
        state.step = 13;
        this.setUserState(chatId, state);

        return this.questions[12];
      }

      return {
        message:
          '❗ Iltimos, telefon raqamingizni kiriting yoki "Raqamni ulashish" tugmasini bosing:',
        keyboard: this.phoneKeyboard,
      };
    }

    // === STEP 13 — USERNAME ===
    if (step === 13) {
      if ('text' in msg && msg.text) {
        const username = msg.text.trim();

        if (!username.startsWith('@')) {
          return '❗ Iltimos, username @ belgisi bilan boshlansin. Masalan: @username\nQaytadan kiriting:';
        }

        if (username.length < 2) {
          return '❗ Iltimos, toʻgʻri username kiriting. Masalan: @username\nQaytadan kiriting:';
        }

        state.answers[13] = username;
        this.setUserState(chatId, state);

        return {
          confirmation: true,
          answers: state.answers,
          gender: state.gender,
        };
      }

      return this.questions[12];
    }

    return null;
  }

  // ===== YORDAMCHI METOD =====
  async handleAnswer(chatId: string, msg: any) {
    return this.handleUserAnswer(chatId, msg);
  }

  // ===== IMAGE GENERATOR =====
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
