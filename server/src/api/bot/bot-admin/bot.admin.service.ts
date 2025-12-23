import { Injectable, NotFoundException } from '@nestjs/common';
import config from 'src/config';
import { Post } from '../common/interfaces';
import { Language, Post_Type, Post_Status } from 'src/common/enums';
import { JobPostsTelegramService } from 'src/api/job-posts-telegram/job-posts-telegram.service';
import { JobPostsService } from 'src/api/job-posts/job-posts.service';
import * as fs from 'fs';
import { UserLanguageService } from 'src/api/user/user-language.service';
import { catchError } from 'src/infrastructure/response';

const API_PREFIX = 'api/v1';

@Injectable()
export class BotAdminService {
  constructor(
    private readonly jobPostsTelegramService: JobPostsTelegramService,
    private userLanguageService: UserLanguageService,
    private readonly jobPostsService: JobPostsService,
  ) {}

  private posts: Post[] = []; // Temporary storage - replace with DB

  private isValidUrl(url?: string | null) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Admin state management
  // ...

  generateContactUrl(
    tg_username?: string | null,
    phone_number?: string | null,
  ): string {
    // 1️⃣ Telegram username — ENG ISHONCHLI
    if (tg_username && tg_username.trim()) {
      const username = tg_username.replace(/^@/, '').trim();
      return `https://t.me/${username}`;
    }

    // 2️⃣ Bot / kanal fallback (tel link emas)
    return 'https://t.me/Reztalpost';
  }

  // ========== POST MANAGEMENT ==========

  // Yangi post qo'shish
  async addPost(post): Promise<Post> {
    const newPost: Post = {
      ...post,
      id: this.posts.length + 1,
      job_posts_id: post.job_posts_id,
      createdAt: new Date(),
    };
    this.posts.push(newPost);

    return newPost;
  }

  // Adminlarga yangi post haqida xabar yuborish
  async notifyAdminAboutNewPost(post: Post, bot: any) {
    // DB dagi yangilangan ma'lumotlarga tayanamiz
    const dbPost = post.job_posts_id
      ? await this.jobPostsService.findByPostId(post.job_posts_id, true)
      : null;
    const formattedPost = dbPost
      ? this.formatEntityForAdmin(dbPost)
      : this.formatPostForAdmin(post);

    try {
      let sentMessage;

      // Rasm yo'q bo'lsa placeholder ishlatamiz
      const photoPath =
        (dbPost?.image_path && fs.existsSync(dbPost.image_path)
          ? dbPost.image_path
          : post.imagePath && fs.existsSync(post.imagePath)
            ? post.imagePath
            : null) || null;

      if (photoPath) {
        sentMessage = await bot.sendPhoto(
          config.TELEGRAM_GROUP_ID,
          { source: photoPath },
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

      return sentMessage.message_id; // agar boshqa joyga kerak bo‘lsa
    } catch (error) {
      console.error(`Guruhga xabar yuborishda xato:`, error);
    }
  }

  // Postni tasdiqlash
  async approvePost(groupMessageId: number, ctx) {
    const userId = ctx.from!.id.toString();

    // User tilini olish
    const userLang = this.userLanguageService.getUserLanguage(userId);
    const dto = {
      message_id: String(groupMessageId),
    };
    const groupPost = await this.jobPostsTelegramService.acceptPostOnGroup(
      dto,
      userLang,
    );

    if (!`${groupPost.statusCode}`.startsWith('2')) {
      throw new NotFoundException('Error on finding job post');
    }

    const imagePath = groupPost.data.image_path;
    const hasImage = imagePath && fs.existsSync(imagePath);

    const channelPost = this.formatPostForChannel(groupPost);

    console.log('CHANNEL POST..........: ', channelPost);

    const redirectHost =
      config.PROD_HOST || config.HOST_URL || 'https://t.me/Reztalpost';
    const safeRedirectHost = redirectHost.startsWith('http://')
      ? redirectHost.replace('http://', 'https://')
      : redirectHost.startsWith('https://')
        ? redirectHost
        : `https://${redirectHost}`;
    const redirectKey = (channelPost as any).post_id || channelPost.id;
    const contactRedirectUrl = `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}`;
    const hasPortfolio =
      channelPost.portfolio && this.isValidUrl(channelPost.portfolio);
    const portfolioRedirectUrl = hasPortfolio
      ? `${safeRedirectHost}/${API_PREFIX}/job-posts/redirect/${redirectKey}?target=portfolio`
      : null;

    const inlineKeyboard = [
      [
        {
          text: `👁️ Ko'rildi: ${channelPost.viewCount || 0}`,
          callback_data: `views_${redirectKey}`,
        },
      ],
      [
        { text: '📞 Aloqaga chiqish', url: contactRedirectUrl },
        ...(portfolioRedirectUrl
          ? [{ text: '🗂 Portfolio', url: portfolioRedirectUrl }]
          : []),
      ],
    ];

    let sentMessage;

    if (hasImage) {
      sentMessage = await ctx.telegram.sendPhoto(
        config.TELEGRAM_CHANNEL_ID,
        { source: fs.createReadStream(imagePath) },
        {
          caption: channelPost.caption,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        },
      );
    } else {
      sentMessage = await ctx.telegram.sendMessage(
        config.TELEGRAM_CHANNEL_ID,
        channelPost.caption,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        },
      );
    }

    await ctx.telegram.sendMessage(
      groupPost.data.user.telegram_id,
      `🎉 **Tabriklaymiz!**\n\n` +
        `✅ Postingiz tasdiqlandi va kanalga joylandi!\n` +
        `📊 Endi boshqalar sizning ${groupPost.data.type === Post_Type.RESUME ? 'rezyume' : 'vakansiya'}ngizni ko'rishadi.\n\n` +
        `🔗 Kanal: ${config.BOT_USERNAME}`,
      {
        parse_mode: 'Markdown',
      },
    );

    return {
      message_id: String(sentMessage.message_id),
      job_posts_id: String(groupPost.data.id),
    };
  }

  // Postni rad etish (statusni REJECTED qilib, userga sababni yuborish)
  async rejectPostWithReason(
    postId: string,
    reason: string,
    ctx: any,
    groupMessageId: number | string,
  ) {
    // Find post by postId (supports post_id or uuid)
    const post =
      (await this.jobPostsService.findByPostId(postId, true)) ||
      (await this.jobPostsService.findByPostId(String(postId), true));
    if (!post) {
      throw new NotFoundException('Job post not found');
    }

    // Update status
    await this.jobPostsService.updatePostStatus(post.id || post.post_id, Post_Status.REJECTED);

    // Try to remove inline keyboard from group message
    try {
      if (groupMessageId && config.TELEGRAM_GROUP_ID) {
        await ctx.telegram.editMessageReplyMarkup(
          config.TELEGRAM_GROUP_ID,
          Number(groupMessageId),
          undefined,
          { inline_keyboard: [] },
        );
      }
    } catch (err) {
      console.log('Failed to clear group keyboard on reject', err?.message);
    }

    // Build localized reject message
    const buildRejectMessage = (lang: Language) => {
      if (lang === Language.RU) {
        return (
          `❌ Ваш пост отклонен.\n` +
          `ℹ️ Причина: ${reason}\n\n` +
          `📝 Пожалуйста, исправьте данные и отправьте заново.`
        );
      }
      if (lang === Language.EN) {
        return (
          `❌ Your post has been rejected.\n` +
          `ℹ️ Reason: ${reason}\n\n` +
          `📝 Please review the data and resubmit.`
        );
      }
      return (
        `❌ Postingiz rad etildi.\n` +
        `ℹ️ Sabab: ${reason}\n\n` +
        `📝 Ma'lumotlarni tekshirib qayta topshiring.`
      );
    };

    // Notify user if telegram_id exists
    if (post.user?.telegram_id) {
      const userLang =
        this.userLanguageService.getUserLanguage(post.user.telegram_id) ||
        Language.UZ;
      const message = buildRejectMessage(userLang);
      try {
        await ctx.telegram.sendMessage(post.user.telegram_id, message);
      } catch (err) {
        console.log('Failed to notify user on reject', err?.message);
      }
    }

    return post;
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

  // Postni admin uchun formatlash (DB Entity ga tayangan holatda)
  formatEntityForAdmin(post: any): { caption: string; keyboard: any } {
    const typeText =
      post.type === Post_Type.RESUME ? '🧑‍💼 REZYUME' : '🏢 VAKANSIYA';

    const subCat =
      post.subCategory?.translations?.[0]?.name ||
      post.subCategory?.translations?.find?.((t) => t.lang === Language.UZ)
        ?.name ||
      '...';

    const caption =
      post.type === Post_Type.RESUME
        ? `
${typeText}

🎯 <b>Kasb:</b> ${subCat}
📊 <b>Tajriba:</b> ${post.experience || '...'}
💰 <b>Maosh:</b> ${post.salary || '...'}
👤 <b>Ism:</b> ${post.user?.name || '...'}
🎂 <b>Yosh:</b> ${post.age || '...'}
📍 <b>Hudud:</b> ${post.address || '...'}
🌐 <b>Tillar:</b> ${post.language || '...'}
📁 <b>Portfolio:</b> ${post.portfolio || '...'}
💼 <b>Ko'nikmalar:</b> ${post.skills || '...'}
📞 <b>Telefon:</b> ${post.user?.phone_number || '...'}
👤 <b>Username:</b> ${post.telegram_username || '...'}
        `.trim()
        : `
${typeText}

🎯 <b>Kasb:</b> ${subCat}
🏛 <b>Kompaniya:</b> ${post.user?.company_name || '...'}
🖥 <b>Ish turi:</b> ${post.work_format || '...'}
📍 <b>Hudud:</b> ${post.address || '...'}
📈 <b>Daraja:</b> ${post.level || '...'}
📋 <b>Talablar:</b> ${post.skills || '...'}
💰 <b>Maosh:</b> ${post.salary || '...'}
📁 <b>Portfolio:</b> ${post.portfolio || '...'}
📞 <b>Telefon:</b> ${post.user?.phone_number || '...'}
👤 <b>Username:</b> ${post.telegram_username || '...'}
        `.trim();

    const postId = post.id || post.post_id;
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Tasdiqlash', callback_data: `approve_${postId}` },
          { text: '❌ Bekor qilish', callback_data: `reject_${postId}` },
        ],
      ],
    };
    return { caption, keyboard };
  }

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
      typeText = '🏢 VAKANSIYA';
      const data = post.data;

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
          {
            text: '✅ Tasdiqlash',
            callback_data: `approve_${post.job_posts_id || post.id}`,
          },
          {
            text: '❌ Bekor qilish',
            callback_data: `reject_${post.job_posts_id || post.id}`,
          },
        ],
      ],
    };

    return { caption, keyboard };
  }

  // Postni kanal uchun formatlash
  formatPostForChannel(result) {
    const data = result.data;

    if (data.type === Post_Type.RESUME) {
      const caption = `
▫️${data.subCategory.translations[0].name || 'Kasb'}

💰 Maosh: ${data.salary || 'Kelishilgan'}

Ism: ${data.user.name || '...'}
Yosh: ${data.age || '...'}
Tajriba: ${data.experience || '...'}
Hudud: ${data.address || '...'}
Tillar: ${data.language || '...'}
Ko'nikmalar: ${data.skills || '...'}

Aloqa uchun:
${data.user.phone_number || ''}
- - - - -

🧑‍💼 Rezyume joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim();
      const viewCount = data.view_count;
      console.log('USERNAME.........: ', data.telegram_username);
      return {
        caption,
        contact: {
          username: data.telegram_username,
          phone_number: data.user.phone_number,
        },
        viewCount,
        id: data.post_id,
        portfolio: data.portfolio,
      };
    } else {
      const data = result.data;
      return {
        caption: `
▫️${data.subCategory.translations[0].name || 'Lavozim'} kerak

💰 Maosh: ${data.salary || 'Kelishilgan'}

Kompaniya: ${data.user.company_name || '...'}
Hudud: ${data.address || '...'}
Ish turi: ${data.work_format || '...'}
Talablar: ${data.skills || '...'}

Aloqa uchun:
${data.user.phone_number || ''} ${data.telegram_username || ''}

- - - - -

🏢 Vakansiya joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
        portfolio: data.portfolio,
        viewCount: data.view_count,
        id: data.post_id || data.id,
      };
    }
  }

  formatJobFilter(result): { caption: string } {
    const data = result.data;
    if (data.type === Post_Type.RESUME) {
      return {
        caption: `
▫️${data.subCategory.translations[0].name || 'Kasb'}

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
