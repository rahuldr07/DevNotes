export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
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

export interface PaginatedNotesResponse {
  items: Note[];
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
  joined_at: string;
  notes: Note[];
}
