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
      ['Andijon', 'Farg‘ona', 'Namangan'],
      ['Samarqand', 'Buxoro', 'Xorazm'],
      ['Qashqadaryo', 'Surxondaryo'],
      ['Jizzax', 'Sirdaryo', 'Navoiy'],
      ['Qoraqalpog‘iston'],
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

  // ===== QUESTIONS =====
  questions = [
    '1. Kasbingiz nima?',
    '2. Rezyumengizni PDF ko‘rinishida yuboring.',
    '3. Tajribangiz qancha?',
    '4. Qancha maosh so‘raysiz?',
    '5. Ismingiz?',
    '6. Yoshingiz?',
    '7. Jinsingizni tanlang:',
    '8. Yashash joyingizni tanlang:',
    '9. Til bilimingizni tanlang:',
    '10. Portfolio (agar bo‘lsa)?',
    '11. Sohangizga aloqador ko‘nikmalar?',
    '12. Telefon raqamingiz?',
    '13. Telegram username?',
  ];

  // ===== START STATE =====
  async startCollection(chatId: string): Promise<string> {
    this.userStates.set(chatId, {
      step: 1,
      answers: {},
      awaitingLanguageText: false,
      gender: null,
    });
    return this.questions[0];
  }

  // ===== MAIN LOGIC =====
  async handleAnswer(chatId: string, msg: any) {
    const state = this.userStates.get(chatId);
    if (!state) return null;

    const step = state.step;

    // 7, 8, 9, 10, 12 — Update ichida boshqariladi
    if (step === 7 || step === 8 || step === 9 || step === 10 || step === 12)
      return null;

    // === STEP 2 — PDF ===
    if (step === 2) {
      if (!msg.document) {
        return '❗ Iltimos, rezyumeni PDF shaklda yuboring.';
      }

      // Faqat PDF fayllarni qabul qilish
      const fileName = msg.document.file_name?.toLowerCase() || '';
      const mimeType = msg.document.mime_type || '';

      if (!fileName.endsWith('.pdf') && mimeType !== 'application/pdf') {
        return '❗ Iltimos, faqat PDF formatidagi rezyumeni yuboring. Boshqa formatdagi fayllar qabul qilinmaydi.';
      }

      state.answers[2] = 'PDF qabul qilindi';
    }
    // === MATN JAVOBLARI ===
    else if ('text' in msg) {
      state.answers[step] = msg.text;
    } else {
      return null;
    }

    // === NEXT STEP ===
    state.step++;

    // === FINISH ===
    if (state.step > 13) {
      const result = await this.generateImage(state.answers, state.gender);
      this.userStates.delete(chatId);
      return result;
    }

    // 6-qadamdan keyin 7-qadamga o'tish
    if (state.step === 7) {
      return 'step7'; // Maxsus signal
    }

    // 11-qadamdan keyin 12-qadamga o'tish
    if (state.step === 12) {
      return 'step12'; // Maxsus signal
    }

    return this.questions[state.step - 1];
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
