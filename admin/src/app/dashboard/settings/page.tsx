"use client";

import { ExternalLink, Loader2, Save, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { api } from "@/lib/api";
import { type AuthUser, useAuthStore } from "@/stores/useAuthStore";

interface ProfileForm {
  name: string;
  username: string;
  bio: string;
  website_url: string;
  github_url: string;
  twitter_url: string;
  avatar_url: string;
}

function toForm(user: AuthUser | null): ProfileForm {
  return {
    name: user?.name ?? "",
    username: user?.username ?? "",
    bio: user?.bio ?? "",
    website_url: user?.website_url ?? "",
    github_url: user?.github_url ?? "",
    twitter_url: user?.twitter_url ?? "",
    avatar_url: user?.avatar_url ?? "",
  };
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(toForm(user));
  }, [user]);

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<AuthUser>("/auth/profile", form);
      setUser(updated);
      gooeyToast.success("Profile updated", {
        description: "Your public DevNotes identity is now fresh.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Profile update failed";
      gooeyToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="type-eyebrow mb-3 text-[var(--accent)]">
              Public identity
            </p>
            <h1 className="type-hero max-w-3xl text-[var(--text-primary)]">
              Shape your developer knowledge profile.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Your public profile metadata and links.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 items-end gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)]/55 px-3 py-2">
              {[10, 16, 22, 14].map((height) => (
                <span
                  key={height}
                  className="w-1.5 rounded-full bg-[var(--accent)]/60"
                  style={{ height }}
                />
              ))}
            </div>
            {form.username && (
              <Link href={`/u/${form.username}`} target="_blank">
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ExternalLink size={15} />
                  view public profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/70 p-5 backdrop-blur-xl sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-[var(--text-secondary)]">Display name</span>
              <input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-3 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                required
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-[var(--text-secondary)]">Username</span>
              <input
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-3 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="your-handle"
                required
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2 text-sm">
            <span className="text-[var(--text-secondary)]">Bio</span>
            <textarea
              value={form.bio}
              onChange={(event) => setField("bio", event.target.value)}
              rows={4}
              maxLength={280}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-3 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              placeholder="Backend engineer writing about FastAPI, auth, and product systems."
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {form.bio.length}/280
            </span>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["website_url", "Website URL"],
                ["github_url", "GitHub URL"],
                ["twitter_url", "Twitter/X URL"],
                ["avatar_url", "Avatar URL"],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="space-y-2 text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <input
                  value={form[field]}
                  onChange={(event) => setField(field, event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-3 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="https://..."
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 rounded-lg bg-[var(--accent)] px-5 text-[var(--bg)] hover:bg-[var(--accent-hover)]"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              save profile
            </Button>
          </div>
        </form>

        <aside className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/55 p-5 backdrop-blur-xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            live profile card
          </p>
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg)]/60 p-5">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--accent)]">
              <UserCircle size={28} />
            </div>
            <h2 className="break-words text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              @{form.username || "username"}
            </h2>
            <p className="mt-1 text-sm text-[var(--accent)]">
              {form.name || "Display name"}
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              {form.bio || "Add a short bio to explain what you write about."}
            </p>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">
            Tip: keep your bio specific. “Writing about auth, databases, and
            developer tools” is stronger than “software developer”.
          </p>
        </aside>
      </section>
    </div>
  );
}
