"use client";

import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("@/components/ui/RichEditor"), {
  ssr: false,
});

interface ReadOnlyEditorProps {
  content: string;
}

export function ReadOnlyEditor({ content }: ReadOnlyEditorProps) {
  return <RichEditor initialContent={content} editable={false} />;
}
