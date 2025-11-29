import { Injectable } from '@nestjs/common';

export interface Statistics {
  totalUsers: number;
  newUsers: number;
  totalPosts: number;
  pendingPosts: number;
  activeUsers: number;
  blockedUsers: number;
  dailyPosts?: number;
  dailyRevenue?: number;
  monthlyPosts?: number;
  monthlyRevenue?: number;
}

export interface Post {
  id: number;
  type: 'rezume' | 'vacancy';
  userId: string;
  userInfo: any;
  data: any;
  imagePath?: string;
  caption?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

@Injectable()
export class BotAdminService {
  private adminStates = new Map<string, any>();
  private posts: Post[] = []; // Temporary storage - replace with DB
  private readonly CHANNEL_ID = '@workandvacancypostschanel'; // O'z kanalingizni qo'ying

  // Admin klaviaturalari
  public adminMainKeyboard = {
    keyboard: [
      ['👥 User Management', '📊 Statistika'],
      ['📢 Xabar Yuborish', '⚙️ Sozlamalar'],
      ['✅ Tasdiqlash Kutilmoqda', '📋 Aktiv Postlar'],
    ],
    resize_keyboard: true,
  };

  public userManagementKeyboard = {
    keyboard: [
      ['📋 Barcha Userlar', '🔍 User Qidirish'],
      ['🚫 Userni Bloklash', '✅ Userni Aktivlashtirish'],
      ['🔙 Orqaga'],
    ],
    resize_keyboard: true,
  };

  public statisticsKeyboard = {
    keyboard: [
      ['📈 Kunlik Statistika', '📊 Oylik Statistika'],
      ['👥 User Statistika', '📝 Post Statistika'],
      ['🔙 Orqaga'],
    ],
    resize_keyboard: true,
  };

  public settingsKeyboard = {
    keyboard: [
      ['💰 Toʻlov Narxi', '📢 Kanal Qoʻshish'],
      ['👥 Doʻst Ulashish', '🔔 Obuna Boʻlish'],
      ['🔙 Orqaga'],
    ],
    resize_keyboard: true,
  };

  public paymentKeyboard = {
    keyboard: [['💳 Xodim Toʻlovi', '💼 HR Toʻlovi'], ['🔙 Orqaga']],
    resize_keyboard: true,
  };

  public channelKeyboard = {
    keyboard: [
      ['➕ Kanal Qoʻshish', '➖ Kanal Oʻchirish'],
      ['📋 Kanallar Roʻyxati'],
      ['🔙 Orqaga'],
    ],
    resize_keyboard: true,
  };

  public postActionKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Tasdiqlash', callback_data: 'approve_' },
        { text: '❌ Rad etish', callback_data: 'reject_' },
      ],
    ],
  };

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

  // Admin tekshirish
  isAdmin(userId: string): boolean {
    const adminUsers = ['5411202292']; // O'z ID ingizni qo'shing
    return adminUsers.includes(userId);
  }

  // ========== POST MANAGEMENT ==========

  // Yangi post qo'shish
  async addPost(post: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
    const newPost: Post = {
      ...post,
      id: this.posts.length + 1,
      createdAt: new Date(),
    };
    this.posts.push(newPost);

    return newPost;
  }

  // Tasdiqlash kutilayotgan postlarni olish
  async getPendingPosts(): Promise<Post[]> {
    return this.posts.filter((post) => post.status === 'pending');
  }

  // Barcha postlarni olish
  async getAllPosts(): Promise<Post[]> {
    return this.posts;
  }

  // Postni ID bo'yicha olish
  async getPostById(postId: number): Promise<Post | null> {
    return this.posts.find((post) => post.id === postId) || null;
  }

  // Postni tasdiqlash (bot instance parametr sifatida)
  async approvePost(
    postId: number,
    bot: any,
  ): Promise<{ success: boolean; message: string }> {
    const post = await this.getPostById(postId);
    if (!post) {
      return { success: false, message: 'Post topilmadi!' };
    }

    post.status = 'approved';

    try {
      // Formatlangan postni olish
      const formattedPost = this.formatPostForChannel(post);

      // 1. KANALGA post joylash
      if (formattedPost.imagePath) {
        await bot.sendPhoto(
          this.CHANNEL_ID,
          { source: formattedPost.imagePath },
          {
            caption: formattedPost.caption,
            parse_mode: 'HTML',
          },
        );
      } else {
        await bot.sendMessage(this.CHANNEL_ID, formattedPost.caption, {
          parse_mode: 'HTML',
        });
      }

      // 2. USERGA xabar yuborish
      await bot.sendMessage(
        post.userId,
        `🎉 **Tabriklaymiz!**\n\n` +
          `✅ Postingiz tasdiqlandi va kanalga joylandi!\n` +
          `📊 Endi boshqalar sizning rezyume/vakansiyangizni ko'rishadi.\n\n` +
          `🔗 Kanal: ${this.CHANNEL_ID}`,
        { parse_mode: 'Markdown' },
      );

      return {
        success: true,
        message: 'Post tasdiqlandi va kanalga joylandi!',
      };
    } catch (error) {
      console.error("Kanalga post jo'natishda xato:", error);
      return {
        success: false,
        message: 'Post tasdiqlandi, lekin kanalga joylashda xatolik!',
      };
    }
  }

  // Postni rad etish (bot instance parametr sifatida)
  async rejectPost(
    postId: number,
    reason: string,
    bot: any,
  ): Promise<{ success: boolean; message: string }> {
    const post = await this.getPostById(postId);
    if (!post) {
      return { success: false, message: 'Post topilmadi!' };
    }

    post.status = 'rejected';

    try {
      // USERGA rad etish sababini yuborish
      await bot.sendMessage(
        post.userId,
        `❌ **Postingiz rad etildi**\n\n` +
          `ℹ️ Sabab: ${reason}\n\n` +
          `📝 Iltimos, ma'lumotlaringizni tekshirib, qayta urinib ko'ring.`,
        { parse_mode: 'Markdown' },
      );

      return { success: true, message: 'Post rad etildi!' };
    } catch (error) {
      console.error('Userga rad etish xabarini yuborishda xato:', error);
      return {
        success: false,
        message: 'Post rad etildi, lekin userga xabar yuborishda xatolik!',
      };
    }
  }

  // Adminlarga yangi post haqida bildirishnoma (bot instance parametr sifatida)
  async notifyAdminsAboutNewPost(post: Post, bot: any) {
    const adminUsers = ['5411202292']; // Admin ID lari

    const notificationText =
      `🆕 **Yangi Post Kutilmoqda**\n\n` +
      `📝 Turi: ${post.type === 'rezume' ? 'Rezyume' : 'Vakansiya'}\n` +
      `👤 User: ${post.userInfo?.username || "Noma'lum"}\n` +
      `🕐 Vaqt: ${post.createdAt.toLocaleString()}\n` +
      `🔢 ID: ${post.id}\n\n` +
      `Tasdiqlash uchun admin paneliga kiring.`;

    for (const adminId of adminUsers) {
      try {
        await bot.sendMessage(adminId, notificationText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📋 Admin Panel',
                  url: 'https://t.me/reztal_post_bot?start=admin',
                },
              ],
            ],
          },
        });
      } catch (error) {
        console.error(`Admin ${adminId} ga xabar yuborishda xato:`, error);
      }
    }
  }

  // ========== USER MANAGEMENT ==========

  // Userlarni olish
  async getAllUsers() {
    // DB dan userlarni olish - hozircha demo
    return [
      { id: 1, username: 'user1', role: 'xodim', status: 'active' },
      { id: 2, username: 'user2', role: 'hr', status: 'active' },
      { id: 3, username: 'user3', role: 'xodim', status: 'blocked' },
    ];
  }

  // Statistika olish
  async getStatistics(period: 'daily' | 'monthly'): Promise<Statistics> {
    const pendingPosts = await this.getPendingPosts();
    const allPosts = await this.getAllPosts();

    const baseStats = {
      totalUsers: 150,
      newUsers: 15,
      totalPosts: allPosts.length,
      pendingPosts: pendingPosts.length,
      activeUsers: 135,
      blockedUsers: 15,
    };

    if (period === 'daily') {
      return {
        ...baseStats,
        dailyPosts: 12,
        dailyRevenue: 450000,
      };
    } else {
      return {
        ...baseStats,
        monthlyPosts: 245,
        monthlyRevenue: 12500000,
      };
    }
  }

  // Userlarni boshqarish
  async blockUser(userId: number) {
    // DB da userni bloklash
    return { success: true, message: 'User bloklandi!' };
  }

  async unblockUser(userId: number) {
    // DB da userni aktivlashtirish
    return { success: true, message: 'User aktivlashtirildi!' };
  }

  // Sozlamalarni yangilash
  async updatePaymentAmount(role: 'xodim' | 'hr', amount: number) {
    return {
      success: true,
      message: `To'lov miqdori yangilandi: ${amount} so'm`,
    };
  }

  async addChannel(channel: string) {
    return { success: true, message: "Kanal qo'shildi!" };
  }

  async removeChannel(channel: string) {
    return { success: true, message: "Kanal o'chirildi!" };
  }

  // Postni kanal uchun formatlash
  formatPostForChannel(post: Post): { caption: string; imagePath?: string } {
    if (post.type === 'rezume') {
      const data = post.data;
      return {
        imagePath: post.imagePath,
        caption: `
🧑‍💼 <b>YANGI REZYUME</b>

🎯 <b>Kasb:</b> ${data[1] || '...'}
📊 <b>Tajriba:</b> ${data[3] || '...'} 
💰 <b>Maosh:</b> ${data[4] || '...'}
📍 <b>Hudud:</b> ${data[8] || '...'}
👤 <b>Ism:</b> ${data[5] || '...'}
📞 <b>Aloqa:</b> ${data[12] || ''} ${data[13] || ''}

#Rezyume #IshQidirish
        `.trim(),
      };
    } else {
      const data = post.data;
      return {
        imagePath: post.imagePath,
        caption: `
🏢 <b>YANGI VAKANSIYA</b>

💼 <b>Lavozim:</b> ${data[1] || '...'}
🏛️ <b>Kompaniya:</b> ${data[2] || '...'}
📍 <b>Hudud:</b> ${data[3] || '...'}
🖥️ <b>Ish turi:</b> ${data[4] || '...'}
💰 <b>Maosh:</b> ${data[5] || '...'}
📋 <b>Talablar:</b> ${data[6] || '...'}

📞 <b>Aloqa:</b> ${data[8] || ''} ${data[7] || ''}

#Vakansiya #IshQidirish
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
    return { success: true, message: "Post o'chirildi!" };
  }

  // User postlarini olish
  async getUserPosts(userId: string): Promise<Post[]> {
    return this.posts.filter((post) => post.userId === userId);
  }

  // Post statusini yangilash
  async updatePostStatus(
    postId: number,
    status: 'pending' | 'approved' | 'rejected',
  ): Promise<{ success: boolean; message: string }> {
    const post = await this.getPostById(postId);
    if (!post) {
      return { success: false, message: 'Post topilmadi!' };
    }

    post.status = status;
    return {
      success: true,
      message: `Post statusi ${status} ga o'zgartirildi!`,
    };
  }

  // Postlar soni bo'yicha statistika
  async getPostsStatistics(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    rezume: number;
    vacancy: number;
  }> {
    const allPosts = await this.getAllPosts();

    return {
      total: allPosts.length,
      pending: allPosts.filter((post) => post.status === 'pending').length,
      approved: allPosts.filter((post) => post.status === 'approved').length,
      rejected: allPosts.filter((post) => post.status === 'rejected').length,
      rezume: allPosts.filter((post) => post.type === 'rezume').length,
      vacancy: allPosts.filter((post) => post.type === 'vacancy').length,
    };
  }
}
