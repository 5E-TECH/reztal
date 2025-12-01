import { Injectable } from '@nestjs/common';

export interface Statistics {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  approvedPosts: number;
  rejectedPosts: number;
  rezumePosts: number;
  vacancyPosts: number;
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

export interface Admin {
  id: string;
  username: string;
  phone?: string; // Telefon raqam qo'shildi
  addedBy?: string;
  joinedAt: Date;
}

@Injectable()
export class BotAdminService {
  private adminStates = new Map<string, any>();
  private posts: Post[] = []; // Temporary storage - replace with DB
  private admins: Admin[] = [
    {
      id: '5411202292',
      username: '@urozov04',
      phone: '+998905234382', // Boshlang'ich admin telefon raqami
      joinedAt: new Date(),
    },
  ]; // Boshlang'ich admin

  private readonly CHANNEL_ID = '@workandvacancypostschanel'; // O'z kanalingizni qo'ying

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

  // Admin tekshirish (telefon raqam orqali ham)
  isAdmin(userId: string): boolean {
    return this.admins.some(
      (admin) => admin.id === userId || admin.phone === userId,
    );
  }

  // ========== ADMIN MANAGEMENT ==========

  // Barcha adminlarni olish
  getAllAdmins(): Admin[] {
    return this.admins;
  }

  // Admin qo'shish (Telegram ID orqali)
  addAdmin(
    userId: string,
    username: string,
  ): { success: boolean; message: string } {
    if (this.admins.some((admin) => admin.id === userId)) {
      return { success: false, message: 'Bu user allaqachon admin!' };
    }

    this.admins.push({
      id: userId,
      username: username,
      joinedAt: new Date(),
    });

    return {
      success: true,
      message: `✅ @${username} admin sifatida qo'shildi!`,
    };
  }

  // Admin qo'shish (telefon raqam orqali)
  addAdminByPhone(
    phone: string,
    username: string,
    addedBy: string,
  ): { success: boolean; message: string } {
    // Telefon raqam allaqachon mavjudligini tekshirish
    const existingAdmin = this.admins.find(
      (admin) => admin.phone === phone || admin.username === username,
    );

    if (existingAdmin) {
      return {
        success: false,
        message: `❌ Bu admin allaqachon mavjud!\nTelefon: ${existingAdmin.phone}\nUsername: @${existingAdmin.username}`,
      };
    }

    // Yangi admin yaratish
    const newAdmin: Admin = {
      id: phone, // Telefon raqamni ID sifatida ishlatish
      username: username,
      phone: phone,
      addedBy: addedBy,
      joinedAt: new Date(),
    };

    this.admins.push(newAdmin);

    return {
      success: true,
      message: `✅ Yangi admin qo'shildi!\nTelefon: ${phone}\nUsername: @${username}`,
    };
  }

  // Admin o'chirish
  removeAdmin(userId: string): { success: boolean; message: string } {
    const index = this.admins.findIndex(
      (admin) => admin.id === userId || admin.phone === userId,
    );
    if (index === -1) {
      return { success: false, message: 'Admin topilmadi!' };
    }

    // Oxirgi adminni o'chirish mumkin emas
    if (this.admins.length === 1) {
      return {
        success: false,
        message: "Oxirgi adminni o'chirish mumkin emas!",
      };
    }

    const admin = this.admins[index];
    this.admins.splice(index, 1);

    return {
      success: true,
      message: `✅ @${admin.username} adminlikdan olindi!`,
    };
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

  // Adminlarga yangi post haqida xabar yuborish
  async notifyAdminAboutNewPost(post: Post, bot: any) {
    const formattedPost = this.formatPostForAdmin(post);

    // Barcha adminlarga xabar yuborish
    for (const admin of this.admins) {
      try {
        if (post.imagePath) {
          await bot.sendPhoto(
            admin.id,
            { source: post.imagePath },
            {
              caption: formattedPost.caption,
              parse_mode: 'HTML',
              reply_markup: formattedPost.keyboard,
            },
          );
        } else {
          await bot.sendMessage(admin.id, formattedPost.caption, {
            parse_mode: 'HTML',
            reply_markup: formattedPost.keyboard,
          });
        }
      } catch (error) {
        console.error(`Admin ${admin.id} ga xabar yuborishda xato:`, error);
      }
    }
  }

  // Postni tasdiqlash
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
      // Kanal uchun formatlash
      const channelPost = this.formatPostForChannel(post);

      // 1. KANALGA post joylash
      if (post.imagePath) {
        await bot.sendPhoto(
          this.CHANNEL_ID,
          { source: post.imagePath },
          {
            caption: channelPost.caption,
            parse_mode: 'HTML',
          },
        );
      } else {
        await bot.sendMessage(this.CHANNEL_ID, channelPost.caption, {
          parse_mode: 'HTML',
        });
      }

      // 2. USERGA xabar yuborish
      await bot.sendMessage(
        post.userId,
        `🎉 **Tabriklaymiz!**\n\n` +
          `✅ Postingiz tasdiqlandi va kanalga joylandi!\n` +
          `📊 Endi boshqalar sizning ${post.type === 'rezume' ? 'rezyume' : 'vakansiya'}ngizni ko'rishadi.\n\n` +
          `🔗 Kanal: ${this.CHANNEL_ID}`,
        { parse_mode: 'Markdown' },
      );

      return {
        success: true,
        message: '✅ Post tasdiqlandi va kanalga joylandi!',
      };
    } catch (error) {
      console.error("Kanalga post jo'natishda xato:", error);
      return {
        success: false,
        message: '❌ Post tasdiqlandi, lekin kanalga joylashda xatolik!',
      };
    }
  }

  // Postni rad etish
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
          `📝 Iltimos, ma'lumotlaringizni tekshirib, qayta urinib ko'ring.\n` +
          `🆘 Yordam kerak bo'lsa @Reztalpost ga murojaat qiling.`,
        { parse_mode: 'Markdown' },
      );

      return {
        success: true,
        message: '✅ Post rad etildi va userga xabar yuborildi!',
      };
    } catch (error) {
      console.error('Userga rad etish xabarini yuborishda xato:', error);
      return {
        success: false,
        message: '❌ Post rad etildi, lekin userga xabar yuborishda xatolik!',
      };
    }
  }

  // Postni tahrirlash
  async editPost(
    postId: number,
    field: number,
    value: string,
  ): Promise<{ success: boolean; message: string }> {
    const post = await this.getPostById(postId);
    if (!post) {
      return { success: false, message: 'Post topilmadi!' };
    }

    // Field raqamiga qarab tahrirlash
    if (post.type === 'rezume') {
      // Rezyume uchun field mapping
      const rezumeFields = {
        1: 1, // Kasb
        2: 3, // Tajriba
        3: 4, // Maosh
        4: 5, // Ism
        5: 6, // Yosh
        6: 7, // Jins
        7: 8, // Hudud
        8: 9, // Tillar
        9: 10, // Portfolio
        10: 11, // Ko'nikmalar
        11: 12, // Telefon
        12: 13, // Username
      };

      const actualField = rezumeFields[field];
      if (actualField) {
        post.data[actualField] = value;
      }
    } else {
      // Vakansiya uchun field mapping
      const vacancyFields = {
        1: 1, // Kasb
        2: 2, // Kompaniya
        3: 3, // Hudud
        4: 4, // Ish turi
        5: 5, // Maosh
        6: 6, // Talablar
        7: 7, // Username
        8: 8, // Telefon
      };

      const actualField = vacancyFields[field];
      if (actualField) {
        post.data[actualField] = value;
      }
    }

    // Rasm qayta yaratilmaydi, faqat ma'lumot yangilanadi
    return {
      success: true,
      message: `✅ Post #${postId} ning ${field}-maydoni yangilandi!\nYangi qiymat: ${value}`,
    };
  }

  // ========== STATISTIKA ==========

  // Statistika olish
  async getStatistics(): Promise<Statistics> {
    const allPosts = await this.getAllPosts();

    return {
      totalUsers: 150, // DB dan olish kerak
      totalPosts: allPosts.length,
      pendingPosts: allPosts.filter((p) => p.status === 'pending').length,
      approvedPosts: allPosts.filter((p) => p.status === 'approved').length,
      rejectedPosts: allPosts.filter((p) => p.status === 'rejected').length,
      rezumePosts: allPosts.filter((p) => p.type === 'rezume').length,
      vacancyPosts: allPosts.filter((p) => p.type === 'vacancy').length,
    };
  }

  // ========== FORMAT FUNCTIONS ==========

  // Postni admin uchun formatlash
  formatPostForAdmin(post: Post): { caption: string; keyboard: any } {
    let caption = '';
    let typeText = '';

    if (post.type === 'rezume') {
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

👤 <b>User:</b> @${post.userInfo?.username || "Noma'lum"}
🆔 <b>ID:</b> ${post.id}
🕐 <b>Sana:</b> ${post.createdAt.toLocaleString()}
      `.trim();
    } else {
      typeText = '🏢 VAKANSIYA';
      const data = post.data;
      caption = `
${typeText}

💼 <b>Lavozim:</b> ${data[1] || '...'}
🏛️ <b>Kompaniya:</b> ${data[2] || '...'}
📍 <b>Hudud:</b> ${data[3] || '...'}
🖥️ <b>Ish turi:</b> ${data[4] || '...'}
💰 <b>Maosh:</b> ${data[5] || '...'}
📋 <b>Talablar:</b> ${data[6] || '...'}
👤 <b>Username:</b> ${data[7] || '...'}
📞 <b>Telefon:</b> ${data[8] || '...'}

👤 <b>User:</b> @${post.userInfo?.username || "Noma'lum"}
🆔 <b>ID:</b> ${post.id}
🕐 <b>Sana:</b> ${post.createdAt.toLocaleString()}
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

    return { caption, keyboard };
  }

  // Postni kanal uchun formatlash
  formatPostForChannel(post: Post): { caption: string } {
    if (post.type === 'rezume') {
      const data = post.data;
      return {
        caption: `
▫️${data[1] || 'Kasb'}

💰 Maosh: ${data[4] || 'Kelishilgan'}

Ism: ${data[5] || '...'}
Yosh: ${data[6] || '...'}
Tajriba: ${data[3] || '...'}
Hudud: ${data[8] || '...'}
Tillar: ${Array.isArray(data[9]) ? data[9].join(', ') : data[9] || '...'}
Ko'nikmalar: ${data[11] || '...'}

Aloqa uchun:
${data[12] || ''} ${data[13] || ''}

- - - - -

🧑‍💼 Rezyume joylash: @Reztalpost

@Reztal_jobs bilan eng mosini toping!
        `.trim(),
      };
    } else {
      const data = post.data;
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
      message: `✅ Post statusi ${status} ga o'zgartirildi!`,
    };
  }

  // Telefon raqam orqali admin qidirish
  findAdminByPhone(phone: string): Admin | undefined {
    return this.admins.find((admin) => admin.phone === phone);
  }

  // Username orqali admin qidirish
  findAdminByUsername(username: string): Admin | undefined {
    return this.admins.find((admin) => admin.username === username);
  }
}
