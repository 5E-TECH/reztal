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
