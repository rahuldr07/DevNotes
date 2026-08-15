import GithubSlugger from "github-slugger";
import { stripMarkdown } from "@/lib/notes";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const FENCE = /^\s*(```|~~~)/;
const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Headings for the table of contents, read from the markdown source.
 *
 * Ids come from `github-slugger` — the same slugger `rehype-slug` uses when
 * the document is rendered — so a TOC link and the heading it points at
 * always agree, including on the `-1`, `-2` suffixes duplicate titles get.
 * Rolling our own slug function here is exactly how those two drift apart.
 */
export function extractHeadings(markdown: string, maxLevel = 3): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  let inFence = false;

  for (const line of (markdown || "").split("\n")) {
    if (FENCE.test(line)) {
      // A "# comment" inside a code fence is not a heading.
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = ATX_HEADING.exec(line);
    if (!match) continue;

    const level = match[1].length;
    if (level > maxLevel) continue;

    const text = stripMarkdown(match[2]).trim() || match[2].trim();
    if (!text) continue;

    headings.push({ id: slugger.slug(text), text, level });
  }

  return headings;
}
