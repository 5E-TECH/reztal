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

    // Bo'sh joylarni olib tashlash
    const cleaned = phone.replace(/\s/g, '');

    // Aniq 13 ta belgi va +998XXXXXXXXX formatini tekshirish
    if (cleaned.length !== 13) {
      return {
        isValid: false,
        message: `❗ Telefon raqami aniq 13 ta belgidan iborat bo'lishi kerak.\n\nSiz kiritgan raqam ${cleaned.length} ta belgidan iborat.\n\n✅ To'g'ri format: +998901234567`,
      };
    }

    // +998 bilan boshlanishini tekshirish
    if (!cleaned.startsWith('+998')) {
      return {
        isValid: false,
        message:
          "❗ Telefon raqami +998 bilan boshlanishi kerak.\n\n✅ To'g'ri format: +998901234567",
      };
    }

    // Faqat raqamlar va + belgisini tekshirish
    const phoneRegex = /^\+998\d{9}$/;
    if (!phoneRegex.test(cleaned)) {
      return {
        isValid: false,
        message:
          "❗ Iltimos, toʻgʻri Oʻzbekiston telefon raqamini kiriting.\n\n✅ To'g'ri format: +998901234567\n\n❗ Faqat raqamlar va + belgisi qabul qilinadi.",
      };
    }

    return { isValid: true };
  }

  // ===== TELEFON RAQAMNI TOZALASH =====
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    // 1. Barcha bo'sh joylarni olib tashlash
    let cleaned = phone.replace(/\s/g, '');

    // 2. Agar + belgisi yo'q bo'lsa, qo'shamiz
    if (cleaned.startsWith('+998')) {
      return cleaned
    }

    return cleaned;
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
        // Telefon raqamini tozalash
        const cleanedPhone = this.cleanPhoneNumber(phone);

        // Telefon raqamini validatsiya qilish
        const validation = this.validatePhoneNumber(cleanedPhone);
        if (!validation.isValid) {
          return validation.message; // Xato xabarini qaytarish
        }

        state.answers[8] = cleanedPhone;
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

  // ===== YANGI METOD: generateVacancyImage =====
  async generateVacancyImage(data: any) {
    // generateEmployerImage metodini chaqiramiz, chunki ular bir xil ishni bajaradi
    return this.generateEmployerImage(data);
  }
}
