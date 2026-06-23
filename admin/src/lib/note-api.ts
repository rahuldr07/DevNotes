import { api } from "@/lib/api";
import type { Note, NoteVersion, PaginatedNotesResponse } from "@/types/notes";

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
}: {
  limit?: number;
  cursor?: number | null;
} = {}) {
  const response = await api.get<Note[] | PaginatedNotesResponse>(
    withPagination("/notes/notes", limit, cursor),
  );
  return normalizePage(response);
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

export async function searchNotes(query: string, signal?: AbortSignal) {
  const response = await api.get<Note[] | PaginatedNotesResponse>(
    `/notes/search?q=${encodeURIComponent(query)}`,
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
