import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotVacancyService {
  private employerStates = new Map<string, any>();

  // ===== SAVOLLAR RO'YXATI =====
  questions = [
    '1. Kasb nomi?',
    '2. Kompaniya nomi?',
    '3. Hudud?',
    '4. Ish turi?',
    '5. Maosh?',
    '6. Talablar?',
    '7. Telegram username?',
    '8. Telefon raqam?',
  ];

  // ===== KEYBOARD LAR =====
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

  workTypeKeyboard = {
    keyboard: [['Offline', 'Online'], ['Gibrid']],
    resize_keyboard: true,
    one_time_keyboard: true,
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

    // Telefon raqamini tozalash
    const cleaned = phone.replace(/\D/g, '');

    // +998XXXXXXXXX formatini tekshirish (12 ta belgi)
    const phoneRegex = /^\+998\d{9}$/;

    if (!phoneRegex.test(cleaned)) {
      return {
        isValid: false,
        message:
          '❗ Iltimos, toʻgʻri Oʻzbekiston telefon raqamini kiriting (+998XXXXXXXXX).\n\nMisol: +998901234567\n\n❗ Eslatma: Faqat +998 bilan boshlangan va 12 ta raqamdan iborat raqamlar qabul qilinadi.',
      };
    }

    return { isValid: true };
  }

  // ===== STATE MANAGEMENT =====
  getEmployerState(id: string) {
    return this.employerStates.get(id);
  }

  setEmployerState(id: string, state: any) {
    this.employerStates.set(id, state);
  }

  deleteEmployerState(id: string) {
    this.employerStates.delete(id);
  }

  // ===== KOLLEKSIYANI BOSHLASH =====
  async startEmployerCollection(chatId: string): Promise<string> {
    this.employerStates.set(chatId, {
      step: 1,
      answers: {},
      type: 'employer',
    });
    return this.questions[0];
  }

  // ===== JAVOBLARNI QAYTA ISHLASH =====
  async handleEmployerAnswer(chatId: string, msg: any) {
    const state = this.employerStates.get(chatId);
    if (!state) return null;

    const step = state.step;

    // ===== 8-QADAM — TELEFON RAQAM (MAXSUS ISHLOV) =====
    if (step === 8) {
      let phone = '';

      // Kontakt orqali
      if ('contact' in msg && msg.contact) {
        phone = msg.contact.phone_number;
      }
      // Matn orqali
      else if ('text' in msg && msg.text) {
        phone = msg.text;
      }

      if (phone) {
        // Telefon raqamini validatsiya qilish
        const validation = this.validatePhoneNumber(phone);
        if (!validation.isValid) {
          return validation.message; // Xato xabarini qaytarish
        }

        state.answers[8] = phone;
        state.step = 9; // Keyingi qadam

        // Confirmation uchun maxsus signal qaytaramiz
        return { confirmation: true, answers: state.answers };
      }

      // Telefon kiritilmagan bo'lsa, keyboard qaytaramiz
      return 'step8';
    }

    // ===== QOLGAN QADAMLAR =====
    // Matn javoblarini qabul qilish
    if ('text' in msg) {
      state.answers[step] = msg.text;
    } else {
      return null;
    }

    // Keyingi qadamga o'tish
    state.step++;

    // ===== MAXSUS QADAMLAR =====
    if (state.step === 3) {
      return 'step3'; // Hudud keyboardi uchun
    }

    if (state.step === 4) {
      return 'step4'; // Ish turi keyboardi uchun
    }

    if (state.step === 8) {
      return 'step8'; // Telefon keyboardi uchun
    }

    // ===== YAKUNLASH =====
    if (state.step > this.questions.length) {
      // Confirmation uchun maxsus signal qaytaramiz
      return { confirmation: true, answers: state.answers };
    }

    return this.questions[state.step - 1];
  }

  // ===== RASM GENERATORI =====
  async generateEmployerImage(data: any) {
    const uploadsDir = path.resolve(process.cwd(), 'src', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Employer uchun template (siz yaratasiz)
    const templatePath = path.join(uploadsDir, 'employer_template.png');
    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    // Ma'lumotlarni olish
    const job = data[1] || '';
    const company = data[2] || '';
    const region = data[3] || '';
    const workType = data[4] || '';
    const salary = data[5] || '';
    const requirements = data[6] || '';
    const username = data[7] || '';
    const phone = data[8] || '';

    // Matnlarni chizish (koordinatalarni o'zingiz moslashtiring)
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
