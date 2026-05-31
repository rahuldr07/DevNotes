"use client";

import { Copy, Globe, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

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
    await navigator.clipboard.writeText(publicUrl);
    gooeyToast.success("Link copied");
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
        className="w-80 bg-[var(--bg-secondary)] p-0"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="space-y-4 p-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              share note
            </h4>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              publish a public link or include it in explore
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Globe
                  size={14}
                  className={
                    isPublished
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  }
                />
                <span className="text-xs text-[var(--text-primary)]">
                  public link
                </span>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => runToggle("publish", checked)}
                disabled={loading !== null}
              />
            </div>

            {isPublished && (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  placeholder="link appears after publish"
                  className="min-w-0 flex-1 border-b border-[var(--border)] bg-transparent py-1 text-xs text-[var(--text-secondary)] outline-none"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                  aria-label="Copy public link"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users
                size={14}
                className={
                  isCommunity
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)]"
                }
              />
              <span className="text-xs text-[var(--text-primary)]">
                explore
              </span>
            </div>
            <Switch
              checked={isCommunity}
              onCheckedChange={(checked) => runToggle("community", checked)}
              disabled={loading !== null}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
