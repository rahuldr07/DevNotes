"use client";

import type { Editor } from "@tiptap/react";
import {
  CheckSquare,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table as TableIcon,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * One definition per insertable block, shared by the slash menu and the
 * empty-line insert popover. They used to be two hand-maintained lists of the
 * same commands, which is how a menu ends up offering something the other one
 * does not.
 *
 * `keywords` exist so the slash query matches how people describe a block
 * ("bullet", "ul", "todo") rather than only its label.
 */
export interface EditorBlock {
  id: string;
  label: string;
  /** The markdown shortcut that produces the same block, shown as a hint. */
  hint: string;
  icon: ComponentType<{ size?: number | string }>;
  keywords: string[];
  group: "text" | "lists" | "blocks";
  run: (editor: Editor) => void;
}

export const EDITOR_BLOCKS: EditorBlock[] = [
  {
    id: "paragraph",
    label: "text",
    hint: "",
    icon: Type,
    keywords: ["text", "paragraph", "p", "body", "plain"],
    group: "text",
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading-1",
    label: "heading 1",
    hint: "#",
    icon: Heading1,
    keywords: ["heading", "h1", "title", "large"],
    group: "text",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "heading 2",
    hint: "##",
    icon: Heading2,
    keywords: ["heading", "h2", "subtitle", "section"],
    group: "text",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    label: "heading 3",
    hint: "###",
    icon: Heading3,
    keywords: ["heading", "h3", "subsection"],
    group: "text",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    label: "bullet list",
    hint: "-",
    icon: List,
    keywords: ["bullet", "list", "ul", "unordered", "points"],
    group: "lists",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "numbered list",
    hint: "1.",
    icon: ListOrdered,
    keywords: ["numbered", "ordered", "list", "ol", "steps"],
    group: "lists",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    label: "task list",
    hint: "[ ]",
    icon: CheckSquare,
    keywords: ["task", "todo", "checkbox", "checklist", "check"],
    group: "lists",
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "code-block",
    label: "code block",
    hint: "```",
    icon: FileCode,
    keywords: ["code", "snippet", "fence", "pre", "syntax"],
    group: "blocks",
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "table",
    label: "table",
    hint: "",
    icon: TableIcon,
    keywords: ["table", "grid", "rows", "columns", "matrix"],
    group: "blocks",
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: "blockquote",
    label: "quote",
    hint: ">",
    icon: Quote,
    keywords: ["quote", "blockquote", "citation", "callout"],
    group: "blocks",
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "divider",
    label: "divider",
    hint: "---",
    icon: Minus,
    keywords: ["divider", "rule", "hr", "separator", "line", "break"],
    group: "blocks",
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

export const BLOCK_GROUP_LABELS: Record<EditorBlock["group"], string> = {
  text: "text",
  lists: "lists",
  blocks: "blocks",
};

/** Substring match over label and keywords, in registry order. */
export function filterBlocks(query: string): EditorBlock[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return EDITOR_BLOCKS;
  return EDITOR_BLOCKS.filter(
    (block) =>
      block.label.includes(needle) ||
      block.keywords.some((keyword) => keyword.startsWith(needle)),
  );
}
