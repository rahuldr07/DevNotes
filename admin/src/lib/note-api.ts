import { api } from "@/lib/api";
import type {
  CreateNoteInput,
  Note,
  NoteVersion,
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
}: {
  limit?: number;
  cursor?: number | null;
} = {}) {
  const response = await api.get<Note[] | PaginatedNotesResponse>(
    withPagination("/notes/community", limit, cursor),
  );
  return normalizePage(response);
}

export async function searchNotes(
  query: string,
  signal?: AbortSignal,
  noteType?: string,
) {
  const params = new URLSearchParams({ q: query });
  if (noteType) params.set("note_type", noteType);
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
  return api.get<NoteVersion[]>(`/notes/${noteId}/versions`);
}
