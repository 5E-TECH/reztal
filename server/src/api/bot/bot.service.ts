import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService {
  private userStates = new Map<string, any>();

  questions = [
    '0. Qaysi tarifni tanlaganingiz?',
    '1. Kasbingiz nima?',
    '2. Rezyumengizni PDF ko‘rinishida yuboring.',
    '3. Tajribangiz qancha?',
    '4. Qancha maosh so‘raysiz?',
    '5. Ismingiz?',
    '6. Yoshingiz?',
    '7. Yashash joyingiz (Shahar/Viloyat)?',
    "8. Til bilimingiz (O'zbek/Rus/Ingliz)?",
    '9. Portfolio (agar bo‘lsa)?',
    '10. Sohangizga aloqador ko‘nikmalar?',
    '11. Telefon raqamingiz?',
    '12. Telegram username?',
  ];

  async startCollection(chatId: string) {
    try {
        console.log(chatId);
        this.userStates.set(chatId, { step: 0, answers: {} });
        return this.questions[0];
    } catch (error) {
        console.log(error);
        
    }
    
  }

  async handleAnswer(chatId: string, msg: any) {
    const state = this.userStates.get(chatId);
    if (!state) {
      console.log('wrong state');

      return null;
    }

    const step = state.step;

    if (step === 2 && !msg.document) {
      return '❗ Iltimos, rezyumeni PDF shaklda yuboring.';
    }

    state.answers[step] = msg.text || 'PDF qabul qilindi';
    state.step++;

    if (state.step >= this.questions.length) {
      const finalPost = state.answers;
      const result = await this.generateImage(finalPost);

      this.userStates.delete(chatId);

      return result; // { imagePath, caption }
    }

    return this.questions[state.step];
  }

  private async generateImage(
    data: any,
  ): Promise<{ imagePath: string; caption: string }> {
    const templatePath = path.resolve(
      __dirname,
      process.env.NODE_ENV === 'production'
        ? '../../uploads/template.png'
        : '../../src/uploads/template.png',
    );

    const img = await loadImage(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, img.width, img.height);

    // ==== MA'LUMOTLAR ====
    const name = data[5] || '';
    const age = data[6] || '';
    const job = data[1] || '';
    const salary = data[4] || '';
    const exp = data[3] || '';

    // Ranglar
    const gray = '#606060';
    const black = '#000000';

    // ========================
    // ISM (o‘ngga + pastga)
    // ========================
    ctx.fillStyle = gray;
    ctx.font = 'bold 40px Sans';
    ctx.fillText(name, 450, 780);

    // ========================
    // YOSH (chapga + pastga)
    // ========================
    ctx.fillText(age + ' yosh', 1200, 780);

    // ========================
    // KASB (markazga yaqinroq)
    // ========================
    ctx.fillStyle = black;
    ctx.font = 'bold 90px Sans';
    ctx.fillText(job, 700, 1050);

    // ========================
    // MAOSH (o‘ng & tepaga)
    // ========================
    ctx.fillStyle = gray;
    ctx.font = 'bold 40px Sans';
    ctx.fillText(salary, 450, 1320);

    // ========================
    // TAJRIBA (chapga)
    // ========================
    ctx.fillText(exp, 1200, 1320);

    // ==== Rasmni saqlash ====
    const outputDir = path.resolve(
      __dirname,
      process.env.NODE_ENV === 'production'
        ? '../../uploads'
        : '../../src/uploads',
    );

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = path.join(outputDir, `output_${Date.now()}.png`);

    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    await new Promise<void>((resolve) => out.on('finish', () => resolve()));

    // ============================
    //      CAPTION (YANGILANGAN)
    // ============================
    const caption = `
▫️Kasbi: ${job}

Tajribasi: ${exp}
Maosh: ${salary}

Ismi: ${name}
Yoshi: ${age}
Yashash joyi: ${data[7] || ''}
Til bilimi: ${data[8] || ''}
Portfolio: ${data[9] || ''}
Ko'nikmalar: 
${data[10] || ''}

Aloqa uchun:
${data[11] || ''}
${data[12] || ''}

- - - - -

🪪 Rezyume joylash: @Reztal_post

@Reztal_CV bilan eng mosini toping!
`;

    return { imagePath: fileName, caption };
  }
}
