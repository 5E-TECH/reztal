import { Injectable } from '@nestjs/common';
import config from 'src/config';
import { Post } from '../common/interfaces';
import { InjectRepository } from '@nestjs/typeorm';
import { JobPostsTelegramEntity } from 'src/core/entity/job-posts-telegram.entity';
import type { JobPostsTelegramRepository } from 'src/core/repository/job-posts-telegram.repository';
import { Chat_Type, Post_Type } from 'src/common/enums';
import { JobPostsTelegramService } from 'src/api/job-posts-telegram/job-posts-telegram.service';
import path from 'path';
import * as fs from 'fs';

@Injectable()
export class BotAdminService {
  constructor(
    private readonly jobPostsTelegramService: JobPostsTelegramService,
  ) {}

  private adminStates = new Map<string, any>();
  private posts: Post[] = []; // Temporary storage - replace with DB

  // Admin state management
  setAdminState(chatId: string, state: any) {
    this.adminStates.set(chatId, state);
  }

  getAdminState(chatId: string) {
    return this.adminStates.get(chatId);
  }

  deleteAdminState(chatId: string) {
    this.adminStates.delete(chatId);
  }

  // ========== POST MANAGEMENT ==========

  // Yangi post qo'shish
  async addPost(post): Promise<Post> {
    const newPost: Post = {
      ...post,
      id: this.posts.length + 1,
      createdAt: new Date(),
    };
    this.posts.push(newPost);

    return newPost;
  }

  // Adminlarga yangi post haqida xabar yuborish
  async notifyAdminAboutNewPost(post: Post, bot: any) {
    const formattedPost = this.formatPostForAdmin(post);

    try {
      let sentMessage;

      console.log(formattedPost);

      if (post.imagePath) {
        sentMessage = await bot.sendPhoto(
          config.TELEGRAM_GROUP_ID,
          { source: post.imagePath },
          {
            caption: formattedPost.caption,
            parse_mode: 'HTML',
            reply_markup: formattedPost.keyboard,
          },
        );
      } else {
        sentMessage = await bot.sendMessage(
          config.TELEGRAM_GROUP_ID,
          formattedPost.caption,
          {
            parse_mode: 'HTML',
            reply_markup: formattedPost.keyboard,
          },
        );
      }

      // 🔥 Mana shu yerda MESSAGE ID mavjud
      console.log('Sent message ID:', sentMessage.message_id);
      console.log('Full Telegram Message:', sentMessage);

      return sentMessage.message_id; // agar boshqa joyga kerak bo‘lsa
    } catch (error) {
      console.error(`Guruhga xabar yuborishda xato:`, error);
    }
  }

  // Postni tasdiqlash
  async approvePost(groupMessageId: number, bot: any) {
    const dto = {
      message_id: String(groupMessageId),
    };
    const groupPost = await this.jobPostsTelegramService.acceptPostOnGroup(dto);

    if (!`${groupPost.statusCode}`.startsWith('2')) {
      return 'Error on approving post';
    }

    const imagePath = groupPost.data.image_path;

    if (!fs.existsSync(imagePath)) {
      return 'Image not found: ' + imagePath;
    }

    const channelPost = this.formatPostForChannel(groupPost);

    const sentMessage = await bot.sendPhoto(
      config.TELEGRAM_CHANNEL_ID,
      { source: fs.createReadStream(imagePath) },
      {
        caption: channelPost.caption,
        parse_mode: 'HTML',
      },
    );

    await bot.sendMessage(
      groupPost.data.user.telegram_id,
      `🎉 **Tabriklaymiz!**\n\n` +
        `✅ Postingiz tasdiqlandi va kanalga joylandi!\n` +
        `📊 Endi boshqalar sizning ${groupPost.data.type === Post_Type.RESUME ? 'rezyume' : 'vakansiya'}ngizni ko'rishadi.\n\n` +
        `🔗 Kanal: ${config.BOT_USERNAME}`,
      { parse_mode: 'Markdown' },
    );

    return {
      message_id: String(sentMessage.message_id),
      job_posts_id: String(groupPost.data.id),
    };
  }

  // Postni rad etish
  // async rejectPost(
  //   postId: number,
  //   reason: string,
  //   bot: any,
  // ): Promise<{ success: boolean; message: string }> {
  //   const post = await this.getPostById(postId);
  //   if (!post) {
  //     return { success: false, message: 'Post topilmadi!' };
  //   }

  //   post.status = 'rejected';

  //   try {
  //     // USERGA rad etish sababini yuborish
  //     await bot.sendMessage(
  //       post.userId,
  //       `❌ **Postingiz rad etildi**\n\n` +
  //         `ℹ️ Sabab: ${reason}\n\n` +
  //         `📝 Iltimos, ma'lumotlaringizni tekshirib, qayta urinib ko'ring.\n` +
  //         `🆘 Yordam kerak bo'lsa @Reztalpost ga murojaat qiling.`,
  //       { parse_mode: 'Markdown' },
  //     );

  //     return {
  //       success: true,
  //       message: '✅ Post rad etildi va userga xabar yuborildi!',
  //     };
  //   } catch (error) {
  //     console.error('Userga rad etish xabarini yuborishda xato:', error);
  //     return {
  //       success: false,
  //       message: '❌ Post rad etildi, lekin userga xabar yuborishda xatolik!',
  //     };
  //   }
  // }

  // Postni tahrirlash
  // async editPost(
  //   postId: number,
  //   field: number,
  //   value: string,
  // ): Promise<{ success: boolean; message: string }> {
  //   const post = await this.getPostById(postId);
  //   if (!post) {
  //     return { success: false, message: 'Post topilmadi!' };
  //   }

  //   // Field raqamiga qarab tahrirlash
  //   if (post.type === 'rezume') {
  //     // Rezyume uchun field mapping
  //     const rezumeFields = {
  //       1: 1, // Kasb
  //       2: 3, // Tajriba
  //       3: 4, // Maosh
  //       4: 5, // Ism
  //       5: 6, // Yosh
  //       6: 7, // Jins
  //       7: 8, // Hudud
  //       8: 9, // Tillar
  //       9: 10, // Portfolio
  //       10: 11, // Ko'nikmalar
  //       11: 12, // Telefon
  //       12: 13, // Username
  //     };

  //     const actualField = rezumeFields[field];
  //     if (actualField) {
  //       post.data[actualField] = value;
  //     }
  //   } else {
  //     // Vakansiya uchun field mapping
  //     const vacancyFields = {
  //       1: 1, // Kasb
  //       2: 2, // Kompaniya
  //       3: 3, // Hudud
  //       4: 4, // Ish turi
  //       5: 5, // Maosh
  //       6: 6, // Talablar
  //       7: 7, // Username
  //       8: 8, // Telefon
  //     };

  //     const actualField = vacancyFields[field];
  //     if (actualField) {
  //       post.data[actualField] = value;
  //     }
  //   }

  //   // Rasm qayta yaratilmaydi, faqat ma'lumot yangilanadi
  //   return {
  //     success: true,
  //     message: `✅ Post #${postId} ning ${field}-maydoni yangilandi!\nYangi qiymat: ${value}`,
  //   };
  // }

  // ========== STATISTIKA ==========

  // ========== FORMAT FUNCTIONS ==========

  // Postni admin uchun formatlash
  formatPostForAdmin(post: Post): { caption: string; keyboard: any } {
    let caption = '';
    let typeText = '';

    if (post.type === Post_Type.RESUME) {
      typeText = '🧑‍💼 REZYUME';
      const data = post.data;
      caption = `
${typeText}

🎯 <b>Kasb:</b> ${data[1] || '...'}
📊 <b>Tajriba:</b> ${data[3] || '...'}
💰 <b>Maosh:</b> ${data[4] || '...'}
👤 <b>Ism:</b> ${data[5] || '...'}
🎂 <b>Yosh:</b> ${data[6] || '...'}
⚧ <b>Jins:</b> ${data[7] || '...'}
📍 <b>Hudud:</b> ${data[8] || '...'}
🌐 <b>Tillar:</b> ${Array.isArray(data[9]) ? data[9].join(', ') : data[9] || '...'}
📁 <b>Portfolio:</b> ${data[10] || '...'}
💼 <b>Ko'nikmalar:</b> ${data[11] || '...'}
📞 <b>Telefon:</b> ${data[12] || '...'}
👤 <b>Username:</b> ${data[13] || '...'}
      `.trim();
    } else if (post.type === Post_Type.VACANCY) {
      console.log('Vacansiyaga kirdi');

      typeText = '🏢 VAKANSIYA';
      const data = post.data;
      console.log('Vacancy data: ', data);

      caption = `
${typeText}

💼 <b>Lavozim:</b> ${data[1] || '...'}
🏛️ <b>Kompaniya:</b> ${data[2] || '...'}
🖥️ <b>Ish turi:</b> ${data[3] || '...'}
📍 <b>Hudud:</b> ${data[4] || '...'}
   <b>Daraja:</b>  ${data[5] || ''}
📋 <b>Talablar:</b> ${data[6] || '...'}
💰 <b>Maosh:</b> ${data[7] || '...'}
📞 <b>Telefon:</b> ${data[8] || '...'}
👤 <b>Username:</b> ${data[9] || '...'}
      `.trim();
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Tasdiqlash', callback_data: `approve_${post.id}` },
          { text: '✏️ Tahrirlash', callback_data: `edit_${post.id}` },
          { text: '❌ Bekor qilish', callback_data: `reject_${post.id}` },
        ],
      ],
    };

    console.log('Vacancy terurndan oldin');

    return { caption, keyboard };
  }

  // Postni kanal uchun formatlash
  formatPostForChannel(result): { caption: string } {
    const data = result.data;
    if (data.type === Post_Type.RESUME) {
      return {
        caption: `
▫️${data.subCategory.translations.name || 'Kasb'}

💰 Maosh: ${data.salary || 'Kelishilgan'}

Ism: ${data.user.name || '...'}
Yosh: ${data.age || '...'}
Tajriba: ${data.experience || '...'}
Hudud: ${data.address || '...'}
Tillar: ${data.language || '...'}
Ko'nikmalar: ${data.skills || '...'}

Aloqa uchun:
${data.user.phone_number || ''}
${data.telegram_username || ''}
- - - - -

🧑‍💼 Rezyume joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
      };
    } else {
      const data = result;
      return {
        caption: `
▫️${data[1] || 'Lavozim'} kerak

💰 Maosh: ${data[5] || 'Kelishilgan'}

Kompaniya: ${data[2] || '...'}
Hudud: ${data[3] || '...'}
Ish turi: ${data[4] || '...'}
Talablar: ${data[6] || '...'}

Aloqa uchun:
${data[8] || ''} ${data[7] || ''}

- - - - -

🏢 Vakansiya joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
      };
    }
  }

  formatJobFilter(result): { caption: string } {
    const data = result.data;
    if (data.type === Post_Type.RESUME) {
      return {
        caption: `
▫️${data.subCategory.translations.name || 'Kasb'}

💰 Maosh: ${data.salary || 'Kelishilgan'}

Ism: ${data.user.name || '...'}
Yosh: ${data.age || '...'}
Tajriba: ${data.experience || '...'}
Hudud: ${data.address || '...'}
Tillar: ${data.language || '...'}
Ko'nikmalar: ${data.skills || '...'}

Aloqa uchun:
${data.user.phone_number || ''}
${data.telegram_username || ''}
- - - - -

🧑‍💼 Rezyume joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
      };
    } else {
      const data = result;
      return {
        caption: `
▫️${data[1] || 'Lavozim'} kerak

💰 Maosh: ${data[5] || 'Kelishilgan'}

Kompaniya: ${data[2] || '...'}
Hudud: ${data[3] || '...'}
Ish turi: ${data[4] || '...'}
Talablar: ${data[6] || '...'}

Aloqa uchun:
${data[8] || ''} ${data[7] || ''}

- - - - -

🏢 Vakansiya joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
      };
    }
  }

  // Postni o'chirish
  async deletePost(
    postId: number,
  ): Promise<{ success: boolean; message: string }> {
    const postIndex = this.posts.findIndex((post) => post.id === postId);
    if (postIndex === -1) {
      return { success: false, message: 'Post topilmadi!' };
    }

    this.posts.splice(postIndex, 1);
    return { success: true, message: "✅ Post o'chirildi!" };
  }

  // User postlarini olish
  async getUserPosts(userId: string): Promise<Post[]> {
    return this.posts.filter((post) => post.userId === userId);
  }

  // Kanalda postni o'chirish
  // async deleteChannelPost(bot: any, messageId: number): Promise<boolean> {
  //   try {
  //     await bot.deleteMessage(this.CHANNEL_ID, messageId);
  //     return true;
  //   } catch (error) {
  //     console.error("Kanaldagi postni o'chirishda xatolik:", error);
  //     return false;
  //   }
  // }
}
