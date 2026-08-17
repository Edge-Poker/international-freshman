import type { AuthorLike } from "@/lib/format";

export interface ChatProfile extends AuthorLike {
  id: string;
  avatar_url: string | null;
  rank_parts?: number | null;
}

export interface Conversation {
  id: number;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  body: string;
  images: string[];
  read_at: string | null;
  created_at: string;
}
