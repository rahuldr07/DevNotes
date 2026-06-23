"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username?: string | null;
  bio?: string | null;
  website_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  avatar_url?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "devnotes-auth-user",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
