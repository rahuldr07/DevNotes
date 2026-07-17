"use client";

import { Check, Clipboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";

/**
 * Rendered code block for the markdown viewer: a quiet header row with the
 * language label and a copy control above the highlighted <pre>. Used as
 * react-markdown's `pre` component.
 */
export function MarkdownCodeBlock(props: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [lang, setLang] = useState("code");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const code = preRef.current?.querySelector("code");
    const match = /language-([\w+-]+)/.exec(code?.className ?? "");
    if (match) setLang(match[1]);
  }, []);

  const copy = async () => {
    const text = preRef.current?.innerText ?? "";
    if (!text.trim()) return;
    if (await copyToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span>{lang}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={11} /> : <Clipboard size={11} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre ref={preRef} {...props} />
    </div>
  );
}
