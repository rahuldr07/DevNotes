/**
 * RichEditor — TipTap headless editor for NoteForm.
 *
 * Extensions:
 * - StarterKit (headings, bold, italic, lists, blockquote, HR)
 * - CodeBlockLowlight + NodeView (syntax highlight + language pill)
 * - TaskList + TaskItem (interactive checkboxes)
 * - Link with autolink (clickable URLs)
 * - Typography (smart quotes, dashes, arrows)
 * - Placeholder
 * - tiptap-markdown (load/save as Markdown)
 * - BubbleMenu (selection toolbar)
 * - FloatingMenu (empty line commands)
 */
"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Check,
  CheckSquare,
  Clipboard,
  Code,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import { copyToClipboard } from "@/lib/clipboard";

const lowlight = createLowlight(common);

// Language display names for the code block pill
const LANG_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  java: "Java",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  bash: "Bash",
  sh: "Shell",
  sql: "SQL",
  md: "Markdown",
  yaml: "YAML",
  toml: "TOML",
  cpp: "C++",
  c: "C",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  plaintext: "Plain text",
};

// NodeView: renders each code block with a language pill in top-right
function CodeBlockView({ node }: ReactNodeViewProps) {
  const lang = (node.attrs.language as string | null) || "plaintext";
  const label = LANG_NAMES[lang] || lang;
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    const text = node.textContent;
    if (!text.trim()) return;
    if (await copyToClipboard(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      setCopied(false);
    }
  };

  return (
    <NodeViewWrapper className="tiptap-code-block-wrapper">
      <span className="tiptap-code-lang-pill" contentEditable={false}>
        {label}
      </span>
      <button
        type="button"
        className="tiptap-code-copy-btn"
        contentEditable={false}
        onClick={copyCode}
        aria-label="Copy code block"
      >
        {copied ? <Check size={12} /> : <Clipboard size={12} />}
        {copied ? "copied" : "copy"}
      </button>
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

interface RichEditorProps {
  initialContent: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichEditor({
  initialContent,
  onChange,
  placeholder = "Start writing…",
  editable = true,
}: RichEditorProps) {
  // Link popover state — replaces window.prompt()
  const [linkView, setLinkView] = useState<{ open: boolean; draft: string }>({
    open: false,
    draft: "",
  });
  const linkInputRef = useRef<HTMLInputElement>(null);

  const openLinkPopover = useCallback(
    (editor: ReturnType<typeof useEditor>) => {
      if (!editor) return;
      const existing = editor.getAttributes("link").href as string | undefined;
      setLinkView({ open: true, draft: existing ?? "" });
      // Focus the input on next tick after render
      setTimeout(() => linkInputRef.current?.focus(), 0);
    },
    [],
  );

  const confirmLink = useCallback(
    (editor: ReturnType<typeof useEditor>, url: string) => {
      if (!editor) return;
      if (url.trim()) {
        editor.chain().focus().setLink({ href: url.trim() }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setLinkView({ open: false, draft: "" });
    },
    [],
  );

  const cancelLink = useCallback(() => {
    setLinkView({ open: false, draft: "" });
  }, []);

  const editor = useEditor({
    extensions: [
      // link: false — StarterKit v3 bundles Link; we configure our own below.
      StarterKit.configure({ codeBlock: false, link: false }),

      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),

      TaskList,
      TaskItem.configure({ nested: true }),

      Link.configure({
        autolink: true,
        openOnClick: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "tiptap-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),

      Typography,

      Placeholder.configure({ placeholder }),

      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
      }),
    ],
    content: initialContent,
    editorProps: { attributes: { spellcheck: "true" } },
    onUpdate({ editor }) {
      // biome-ignore lint/suspicious/noExplicitAny: TipTap storage is untyped
      onChange?.((editor.storage as any).markdown.getMarkdown());
    },
    editable,
    immediatelyRender: false,
  });

  useEffect(() => {
    // Sync external content (version restore, template) into the editor.
    // Never while the user is typing, and never emitting update — TipTap v3
    // defaults emitUpdate to true, and a re-emit here feeds onChange back
    // into this effect: with markdown serializations that aren't idempotent
    // (escaping in tiptap-markdown), that cascade loops until React kills it
    // with "Maximum update depth exceeded".
    if (!editor || editor.isFocused) return;
    // biome-ignore lint/suspicious/noExplicitAny: TipTap storage is untyped
    const current = (editor.storage as any).markdown.getMarkdown();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  return (
    <div className="rich-editor-root">
      {/* ── Bubble menu ─────────────────────────────────────────── */}
      {editor && editable && (
        <BubbleMenu editor={editor} className="bubble-menu">
          {linkView.open ? (
            /* ── Link editing mode ── */
            <>
              <input
                ref={linkInputRef}
                type="url"
                value={linkView.draft}
                onChange={(e) =>
                  setLinkView((v) => ({ ...v, draft: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmLink(editor, linkView.draft);
                  }
                  if (e.key === "Escape") cancelLink();
                }}
                placeholder="Paste or type a URL…"
                className="bubble-link-input"
              />
              <BBtn
                active={false}
                onClick={() => confirmLink(editor, linkView.draft)}
                title="Confirm link"
              >
                <Check size={13} />
              </BBtn>
              {editor.isActive("link") && (
                <BBtn
                  active={false}
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setLinkView({ open: false, draft: "" });
                  }}
                  title="Remove link"
                >
                  <Link2Off size={13} />
                </BBtn>
              )}
              <BBtn active={false} onClick={cancelLink} title="Cancel">
                <X size={13} />
              </BBtn>
            </>
          ) : (
            /* ── Normal formatting mode ── */
            <>
              <BBtn
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold ⌘B"
              >
                <Bold size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic ⌘I"
              >
                <Italic size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                title="Strikethrough"
              >
                <Strikethrough size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("code")}
                onClick={() => editor.chain().focus().toggleCode().run()}
                title="Inline code"
              >
                <Code size={13} />
              </BBtn>
              <div className="bubble-sep" />
              <BBtn
                active={editor.isActive("heading", { level: 1 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                title="Heading 1"
              >
                <Heading1 size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("heading", { level: 2 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                title="Heading 2"
              >
                <Heading2 size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("heading", { level: 3 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                title="Heading 3"
              >
                <Heading3 size={13} />
              </BBtn>
              <div className="bubble-sep" />
              <BBtn
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                title="Bullet list"
              >
                <List size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                title="Numbered list"
              >
                <ListOrdered size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("taskList")}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                title="Task list"
              >
                <CheckSquare size={13} />
              </BBtn>
              <BBtn
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                title="Blockquote"
              >
                <Quote size={13} />
              </BBtn>
              <div className="bubble-sep" />
              <BBtn
                active={editor.isActive("link")}
                onClick={() => openLinkPopover(editor)}
                title="Link"
              >
                <Link2 size={13} />
              </BBtn>
            </>
          )}
        </BubbleMenu>
      )}

      {/* ── Floating block menu — vertical macOS-style popover that also
             teaches the markdown shortcut for each block ─────────────── */}
      {editor && editable && (
        <FloatingMenu editor={editor} className="floating-menu">
          <p className="floating-header">insert block</p>
          <FBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
            hint="#"
          >
            <Heading1 size={14} />
            <span>heading 1</span>
          </FBtn>
          <FBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
            hint="##"
          >
            <Heading2 size={14} />
            <span>heading 2</span>
          </FBtn>
          <FBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Heading 3"
            hint="###"
          >
            <Heading3 size={14} />
            <span>heading 3</span>
          </FBtn>
          <div className="floating-sep" />
          <FBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            hint="-"
          >
            <List size={14} />
            <span>bullet list</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
            hint="1."
          >
            <ListOrdered size={14} />
            <span>numbered list</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task list"
            hint="[ ]"
          >
            <CheckSquare size={14} />
            <span>task list</span>
          </FBtn>
          <div className="floating-sep" />
          <FBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
            hint="```"
          >
            <FileCode size={14} />
            <span>code block</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
            hint=">"
          >
            <Quote size={14} />
            <span>quote</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
            hint="---"
          >
            <Minus size={14} />
            <span>divider</span>
          </FBtn>
        </FloatingMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function BBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`bubble-btn${active ? " is-active" : ""}`}
      title={title}
    >
      {children}
    </button>
  );
}

function FBtn({
  onClick,
  title,
  hint,
  children,
}: {
  onClick: () => void;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="floating-btn"
      title={title}
    >
      {children}
      {hint && <span className="floating-hint">{hint}</span>}
    </button>
  );
}
