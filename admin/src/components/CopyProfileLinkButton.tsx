"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function CopyProfileLinkButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
      {copied ? "copied link" : "copy profile"}
    </button>
  );
}
