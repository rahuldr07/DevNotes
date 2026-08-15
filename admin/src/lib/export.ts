/**
 * Markdown export.
 *
 * Notes are stored as markdown, so "export" is really "hand the user the file
 * they already have" — no conversion, no server round-trip. Front matter
 * carries the metadata that would otherwise be lost on the way out (tags,
 * type, source), in the same YAML shape Obsidian and Hugo read.
 */
import type { Note } from "@/types/notes";

function slugifyFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "untitled";
}

function yamlString(value: string): string {
  // Quote anything that could be read as YAML syntax.
  return /^[\w .-]+$/.test(value) ? value : JSON.stringify(value);
}

export function noteToMarkdown(note: Note): string {
  const frontMatter: string[] = [
    "---",
    `title: ${yamlString(note.title || "untitled")}`,
  ];

  if (note.note_type) frontMatter.push(`type: ${note.note_type}`);
  if (note.language) frontMatter.push(`language: ${note.language}`);
  if (note.tags.length > 0) {
    frontMatter.push(`tags: [${note.tags.map(yamlString).join(", ")}]`);
  }
  if (note.source_url)
    frontMatter.push(`source: ${yamlString(note.source_url)}`);
  frontMatter.push(`created: ${note.created_at}`);
  if (note.updated_at) frontMatter.push(`updated: ${note.updated_at}`);
  frontMatter.push("---", "");

  return `${frontMatter.join("\n")}\n${note.content}\n`;
}

export function noteFilename(note: Note): string {
  return `${slugifyFilename(note.title)}.md`;
}

/**
 * Saves the markdown as a file.
 *
 * Returns false when the browser blocks the download so the caller can say so
 * — an export that silently does nothing is worse than one that reports it.
 */
export function downloadMarkdown(note: Note): boolean {
  if (typeof document === "undefined") return false;
  try {
    const blob = new Blob([noteToMarkdown(note)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = noteFilename(note);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoke on the next tick; revoking synchronously can cancel the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}
