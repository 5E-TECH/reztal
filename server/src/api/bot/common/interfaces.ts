import {
  Language,
  Post_Status,
  Post_Type,
  Work_Format,
} from 'src/common/enums';
import { Context } from 'telegraf';

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
  job_posts_id?: string;
  type: Post_Type;
  userId: string;
  userInfo: any;
  data: any;
  imagePath?: string;
  caption?: string;
  status: Post_Status;
  createdAt: Date;
}

export interface Admin {
  id: string;
  username: string;
  phone?: string; // Telefon raqam qo'shildi
  addedBy?: string;
  joinedAt: Date;
}

export interface MySession {
  step: number;
  filter: {
    sub_category: string | null;
    location?: string | null;
    work_format?: string | null;
    level?: string | null;
    page: number;
    language: Language;
  };
  category?: string | null;
}

export interface MyContext extends Context {
  session: MySession;
}
