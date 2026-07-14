"use client";

import { Copy, ExternalLink, Globe, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { copyToClipboard } from "@/lib/clipboard";

interface SharePopoverProps {
  noteId: number;
  isPublished: boolean;
  isCommunity: boolean;
  shareUuid: string | null;
  onPublishToggle: (checked: boolean) => Promise<void>;
  onCommunityToggle: (checked: boolean) => Promise<void>;
}

export function SharePopover({
  isPublished,
  isCommunity,
  shareUuid,
  onPublishToggle,
  onCommunityToggle,
}: SharePopoverProps) {
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState<"publish" | "community" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = shareUuid ? `${origin}/s/${shareUuid}` : "";

  const copyLink = async () => {
    if (!publicUrl) return;
    if (await copyToClipboard(publicUrl)) {
      gooeyToast.success("Link copied");
    } else {
      gooeyToast.error("Copy failed", {
        description: "Clipboard access was blocked by the browser.",
      });
    }
  };

  const openPublicLink = () => {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  const runToggle = async (type: "publish" | "community", checked: boolean) => {
    setLoading(type);
    try {
      if (type === "publish") {
        await onPublishToggle(checked);
      } else {
        await onCommunityToggle(checked);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-xs text-[var(--text-secondary)]"
        >
          <Share2 size={14} />
          share
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 overflow-hidden rounded-none bg-[var(--bg-secondary)] p-0 shadow-2xl shadow-black/25"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="border-b border-[var(--border)] bg-[var(--bg)]/35 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <Share2 size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                publish console
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                ship a public note or add it to explore
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Globe
                  size={15}
                  className={
                    isPublished
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  }
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  public link
                </span>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => runToggle("publish", checked)}
                disabled={loading !== null}
              />
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Anyone with the URL can read this note. The link stays stable
              while published.
            </p>

            {isPublished && (
              <div className="mt-3 flex items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-2">
                <input
                  readOnly
                  value={publicUrl}
                  placeholder="link appears after publish"
                  className="min-w-0 flex-1 bg-transparent px-1 text-xs text-[var(--text-secondary)] outline-none"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="grid h-8 w-8 place-items-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                  aria-label="Copy public link"
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  onClick={openPublicLink}
                  className="grid h-8 w-8 place-items-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                  aria-label="Open public link"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users
                  size={15}
                  className={
                    isCommunity
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  }
                />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  explore feed
                </span>
              </div>
              <Switch
                checked={isCommunity}
                onCheckedChange={(checked) => runToggle("community", checked)}
                disabled={loading !== null || (!isPublished && !isCommunity)}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              {isPublished
                ? "Let signed-in readers discover this note from Explore."
                : "Publish the note first before adding it to Explore."}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
