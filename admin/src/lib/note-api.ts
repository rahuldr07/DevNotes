import { api } from "@/lib/api";
import type {
  CreateNoteInput,
  Note,
  NoteVersion,
  NoteVersionSummary,
  PaginatedNotesResponse,
} from "@/types/notes";

function normalizePage(
  response: Note[] | PaginatedNotesResponse,
): PaginatedNotesResponse {
  if (Array.isArray(response)) {
    return { items: response, next_cursor: null };
  }

  return {
    items: response.items ?? response.data ?? [],
    next_cursor: response.next_cursor ?? null,
  };
}

function withPagination(
  endpoint: string,
  limit: number,
  cursor?: number | null,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null && cursor !== undefined) {
    params.set("cursor", String(cursor));
  }
  return `${endpoint}?${params.toString()}`;
}

export async function getUserNotesPage({
  limit = 20,
  cursor = null,
  noteType,
}: {
  limit?: number;
  cursor?: number | null;
  noteType?: string;
} = {}) {
  const endpoint = withPagination("/notes/notes", limit, cursor);
  const response = await api.get<Note[] | PaginatedNotesResponse>(
    noteType
      ? `${endpoint}&note_type=${encodeURIComponent(noteType)}`
      : endpoint,
  );
  return normalizePage(response);
}

export async function createNote(input: CreateNoteInput) {
  return api.post<Note>("/notes/create", {
    tags: [],
    note_type: "note",
    ...input,
  });
}

export interface UpdateNoteInput {
  title?: string | null;
  content?: string | null;
  tags?: string[] | null;
  note_type?: string | null;
  language?: string | null;
  source_url?: string | null;
  is_published?: boolean;
  is_listed?: boolean;
  is_community?: boolean;
}

export async function getNote(noteId: number) {
  return api.get<Note>(`/notes/${noteId}`);
}

export async function updateNote(noteId: number, input: UpdateNoteInput) {
  return api.patch<Note>(`/notes/${noteId}/update`, input);
}

export async function deleteNote(noteId: number) {
  return api.delete<void>(`/notes/${noteId}/delete`);
}

export async function togglePin(noteId: number) {
  return api.patch<Note>(`/notes/${noteId}/pin`, {});
}

export async function getSnippetNotesPage({
  limit = 20,
  cursor = null,
}: {
  limit?: number;
  cursor?: number | null;
} = {}) {
  return getUserNotesPage({ limit, cursor, noteType: "snippet" });
}

export async function getCommunityNotesPage({
  limit = 20,
  cursor = null,
  query,
  tag,
  sort,
}: {
  limit?: number;
  cursor?: number | null;
  query?: string;
  tag?: string | null;
  sort?: "trending" | "recent";
} = {}) {
  // Search and tag filtering happen server-side: Explore paginates, so a
  // client-side filter only ever searched the notes already loaded.
  let endpoint = withPagination("/notes/community", limit, cursor);
  if (query?.trim()) {
    endpoint += `&q=${encodeURIComponent(query.trim())}`;
  }
  if (tag) {
    endpoint += `&tag=${encodeURIComponent(tag)}`;
  }
  if (sort) {
    endpoint += `&sort=${encodeURIComponent(sort)}`;
  }
  const response = await api.get<Note[] | PaginatedNotesResponse>(endpoint);
  return normalizePage(response);
}

export interface CommunityStats {
  notes: number;
  views: number;
  likes: number;
  authors: number;
  topics: Array<{ tag: string; count: number }>;
}

export async function getCommunityStats() {
  return api.get<CommunityStats>("/notes/community/stats");
}

export interface NoteStats {
  total: number;
  published: number;
  private: number;
  listed: number;
  community: number;
  pinned: number;
  snippets: number;
  guides: number;
  checklists: number;
  views: number;
  tags: Array<{ tag: string; count: number }>;
  languages: Array<{ language: string; count: number }>;
}

export async function getNoteStats() {
  return api.get<NoteStats>("/notes/stats");
}

export interface ActivityDay {
  date: string;
  count: number;
}

export async function getActivity(weeks = 26) {
  return api.get<{ weeks: number; since: string; days: ActivityDay[] }>(
    `/notes/activity?weeks=${weeks}`,
  );
}

export interface SearchNotesFilters {
  noteType?: string;
  tag?: string;
  language?: string;
  limit?: number;
}

export async function searchNotes(
  query: string,
  signal?: AbortSignal,
  filters: SearchNotesFilters = {},
) {
  const params = new URLSearchParams({ q: query });
  if (filters.noteType) params.set("note_type", filters.noteType);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.language) params.set("language", filters.language);
  if (filters.limit) params.set("limit", String(filters.limit));
  const response = await api.get<Note[] | PaginatedNotesResponse>(
    `/notes/search?${params.toString()}`,
    { signal },
  );
  return normalizePage(response);
}

export async function likeNote(noteId: number) {
  return api.post<{ liked: boolean; like_count: number }>(
    `/notes/${noteId}/like`,
    {},
  );
}

export async function getNoteVersions(noteId: number) {
  return api.get<NoteVersionSummary[]>(`/notes/${noteId}/versions`);
}

export async function getNoteVersion(noteId: number, versionId: number) {
  return api.get<NoteVersion>(`/notes/${noteId}/versions/${versionId}`);
}
