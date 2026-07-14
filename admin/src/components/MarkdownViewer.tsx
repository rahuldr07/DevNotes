import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  /** Wrap in the editor-style frame (border, gutter, markdown.ts badge). */
  framed?: boolean;
}

/**
 * Server-renderable markdown viewer for read-only surfaces (public share
 * pages, version previews). Reuses the `.tiptap` typography and hljs token
 * styles from globals.css, so it matches the editor pixel-for-pixel without
 * shipping TipTap to pages that never edit.
 */
export function MarkdownViewer({
  content,
  framed = true,
}: MarkdownViewerProps) {
  const body = (
    <div className={framed ? "tiptap" : "tiptap markdown-inline"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!framed) return body;

  return <div className="rich-editor-root markdown-viewer">{body}</div>;
}
