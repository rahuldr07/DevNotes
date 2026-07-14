import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/useAuthStore";

export async function getMe() {
  return api.get<AuthUser>("/auth/me");
}

export interface ProfileUpdateInput {
  name?: string;
  username?: string;
  bio?: string;
  website_url?: string;
  github_url?: string;
  twitter_url?: string;
  avatar_url?: string;
}

export async function updateProfile(input: ProfileUpdateInput) {
  return api.patch<AuthUser>("/auth/profile", input);
}
