"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CopyContentButtonProps {
  content: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyContentButton({
  content,
  label = "copy content",
  copiedLabel = "copied",
  className,
}: CopyContentButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={copy}
      className={className}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
