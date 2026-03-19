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

import { useEffect, useCallback, useState, useRef } from "react";
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Type,
  FileCode,
  CheckSquare,
  Strikethrough,
  Link2,
  Link2Off,
  Check,
  X,
} from "lucide-react";

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
  return (
    <NodeViewWrapper className="tiptap-code-block-wrapper">
      <span className="tiptap-code-lang-pill" contentEditable={false}>
        {label}
      </span>
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

interface RichEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export default function RichEditor({
  initialContent,
  onChange,
  placeholder = "Start writing…",
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
        editor
          .chain()
          .focus()
          .setLink({ href: url.trim() })
          .run();
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
      StarterKit.configure({ codeBlock: false }),

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange((editor.storage as any).markdown.getMarkdown());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown.getMarkdown();
    if (current !== initialContent) editor.commands.setContent(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  return (
    <div className="rich-editor-root">
      {/* ── Bubble menu ─────────────────────────────────────────── */}
      {editor && (
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
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
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

      {/* ── Floating menu ────────────────────────────────────────── */}
      {editor && (
        <FloatingMenu editor={editor} className="floating-menu">
          <span className="floating-label">+</span>
          <FBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
          >
            <Heading1 size={14} />
            <span>H1</span>
          </FBtn>
          <FBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
          >
            <Heading2 size={14} />
            <span>H2</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List size={14} />
            <span>List</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task list"
          >
            <CheckSquare size={14} />
            <span>Tasks</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <FileCode size={14} />
            <span>Code</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={14} />
            <span>Quote</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Text"
          >
            <Type size={14} />
            <span>Text</span>
          </FBtn>
          <FBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus size={14} />
            <span>Line</span>
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
  children,
}: {
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
      className="floating-btn"
      title={title}
    >
      {children}
    </button>
  );
}
