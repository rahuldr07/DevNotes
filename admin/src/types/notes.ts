export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  note_type?: "note" | "snippet" | "guide" | "checklist";
  language?: string | null;
  source_url?: string | null;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string | null;
  share_uuid?: string | null;
  is_published?: boolean;
  is_community?: boolean;
  author_name?: string | null;
  author_username?: string | null;
  like_count?: number;
  view_count?: number;
  liked_by_me?: boolean;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
  note_type?: "note" | "snippet" | "guide" | "checklist";
  language?: string | null;
  source_url?: string | null;
}

export interface PaginatedNotesResponse {
  items: Note[];
  data?: Note[];
  next_cursor: number | null;
}

export interface NoteVersion {
  id: number;
  version: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

export interface AuthorProfile {
  username: string;
  name: string;
  bio?: string | null;
  website_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  avatar_url?: string | null;
  created_at: string;
  public_notes: Note[];
}
