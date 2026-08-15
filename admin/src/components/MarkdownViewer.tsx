import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { MarkdownCodeBlock } from "@/components/MarkdownCodeBlock";
import { MarkdownHeading } from "@/components/MarkdownHeading";

interface MarkdownViewerProps {
  content: string;
  /** Wrap in the editor-style frame (border, gutter, markdown.ts badge). */
  framed?: boolean;
  /**
   * Give headings ids and hover deep-links. On by default; the version-history
   * preview turns it off, where duplicate ids across two rendered copies of
   * the same note would collide.
   */
  anchors?: boolean;
}

/**
 * Server-renderable markdown viewer for read-only surfaces (public share
 * pages, version previews). Reuses the `.tiptap` typography and hljs token
 * styles from globals.css, so it matches the editor pixel-for-pixel without
 * shipping TipTap to pages that never edit.
 *
 * `rehype-slug` assigns heading ids with github-slugger — the same slugger
 * `lib/toc.ts` uses to build the table of contents, so the two agree on
 * duplicate-heading suffixes instead of producing dead links.
 */
export function MarkdownViewer({
  content,
  framed = true,
  anchors = true,
}: MarkdownViewerProps) {
  const body = (
    <div className={framed ? "tiptap" : "tiptap markdown-inline"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={
          anchors ? [rehypeSlug, rehypeHighlight] : [rehypeHighlight]
        }
        components={{
          pre: MarkdownCodeBlock,
          ...(anchors
            ? {
                h1: (props) => <MarkdownHeading level={1} {...props} />,
                h2: (props) => <MarkdownHeading level={2} {...props} />,
                h3: (props) => <MarkdownHeading level={3} {...props} />,
              }
            : {}),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  if (!framed) return body;

  return <div className="rich-editor-root markdown-viewer">{body}</div>;
}
