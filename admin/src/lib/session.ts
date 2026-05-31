import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/useAuthStore";

export function fallbackUserFromEmail(email: string): AuthUser {
  const name = email.split("@")[0]?.trim() || "you";
  return { id: 0, name, email };
}

export async function getCurrentUserAfterAuth(
  email: string,
): Promise<AuthUser> {
  try {
    return await api.get<AuthUser>("/auth/me");
  } catch {
    return fallbackUserFromEmail(email);
  }
}
