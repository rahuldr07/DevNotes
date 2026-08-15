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
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
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
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import { EDITOR_BLOCKS } from "@/components/ui/editor/blocks";
import { SlashCommands } from "@/components/ui/editor/slash-commands";
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

/** Trailing debounce for serialization. Long enough that a fast typist pays
 *  it once per pause, short enough that the 2s autosave never waits on it. */
const SERIALIZE_DEBOUNCE_MS = 250;

export default function RichEditor({
  initialContent,
  onChange,
  placeholder = "Start writing…",
  editable = true,
}: RichEditorProps) {
  // Serializing the whole document to markdown on every keystroke was the
  // dominant cost of typing in a large note: it ran once in onUpdate and a
  // second time in the content-sync effect below, and each emit re-rendered
  // the parent form. The ref lets the sync effect recognise its own output
  // and skip the second serialization entirely.
  const lastEmittedRef = useRef<string | null>(null);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(
    () => () => {
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    },
    [],
  );
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

      // TableKit bundles table/row/header/cell so the whole node family stays
      // on one version.
      TableKit.configure({
        table: { resizable: true, allowTableNodeSelection: true },
      }),

      SlashCommands,

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
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
      emitTimerRef.current = setTimeout(() => {
        // biome-ignore lint/suspicious/noExplicitAny: TipTap storage is untyped
        const markdown = (editor.storage as any).markdown.getMarkdown();
        lastEmittedRef.current = markdown;
        onChangeRef.current?.(markdown);
      }, SERIALIZE_DEBOUNCE_MS);
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
    // The prop is echoing back what this editor just emitted, so there is
    // nothing to sync — and no reason to serialize the document to find out.
    if (initialContent === lastEmittedRef.current) return;
    // biome-ignore lint/suspicious/noExplicitAny: TipTap storage is untyped
    const current = (editor.storage as any).markdown.getMarkdown();
    if (current !== initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      lastEmittedRef.current = initialContent;
    }
  }, [initialContent, editor]);

  return (
    <div className="rich-editor-root">
      {/* ── Bubble menu ─────────────────────────────────────────── */}
      {editor && editable && (
        <BubbleMenu
          editor={editor}
          className="bubble-menu"
          role="toolbar"
          aria-label="Text formatting"
        >
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
              {editor.isActive("table") && (
                <>
                  <div className="bubble-sep" />
                  <BBtn
                    active={false}
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    title="Add row below"
                  >
                    <span className="bubble-text">+row</span>
                  </BBtn>
                  <BBtn
                    active={false}
                    onClick={() =>
                      editor.chain().focus().addColumnAfter().run()
                    }
                    title="Add column right"
                  >
                    <span className="bubble-text">+col</span>
                  </BBtn>
                  <BBtn
                    active={false}
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    title="Delete table"
                  >
                    <Trash2 size={13} />
                  </BBtn>
                </>
              )}
            </>
          )}
        </BubbleMenu>
      )}

      {/* ── Floating block menu — same registry the slash menu reads, so
             the two can never offer different blocks. Also teaches the
             markdown shortcut and the "/" entry point. ─────────────── */}
      {editor && editable && (
        <FloatingMenu editor={editor} className="floating-menu">
          <p className="floating-header">
            insert block <span className="floating-hint">/</span>
          </p>
          {EDITOR_BLOCKS.filter((block) => block.id !== "paragraph").map(
            (block) => {
              const Icon = block.icon;
              return (
                <FBtn
                  key={block.id}
                  onClick={() => block.run(editor)}
                  title={block.label}
                  hint={block.hint}
                >
                  <Icon size={14} />
                  <span>{block.label}</span>
                </FBtn>
              );
            },
          )}
        </FloatingMenu>
      )}

      {/* ── Drag handle — appears in the gutter of the hovered block and
             reorders it. MIT since Tiptap opened up the Pro extensions. */}
      {editor && editable && (
        <DragHandle editor={editor} className="drag-handle">
          <span className="drag-handle-grip" aria-hidden>
            <GripVertical size={14} />
          </span>
        </DragHandle>
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
      aria-label={title}
      aria-pressed={active}
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
      aria-label={title}
    >
      {children}
      {hint && <span className="floating-hint">{hint}</span>}
    </button>
  );
}
