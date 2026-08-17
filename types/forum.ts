export interface ForumAuthor {
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  chapters_done: number | null;
  rank_parts: number | null;
  is_admin: boolean | null;
}

export interface ForumTopic {
  id: number;
  category_id: number;
  user_id: string;
  title: string;
  body: string;
  images: string[];
  score: number;
  reply_count: number;
  pinned_until: string | null;
  is_locked: boolean;
  is_featured: boolean;
  created_at: string;
  author?: ForumAuthor | null;
}

export interface ForumPost {
  id: number;
  topic_id: number;
  user_id: string;
  body: string;
  images: string[];
  score: number;
  created_at: string;
  author?: ForumAuthor | null;
}

export interface ForumCategory {
  id: number;
  slug: string;
  title: string;
  description: string | null;
}

export type VoteValue = -1 | 0 | 1;
export type VoteTarget = "topic" | "post";
