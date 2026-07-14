export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawTag of tags) {
    const cleaned = normalizeTag(rawTag);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

// Strip markdown syntax before text-based operations (preview/search/word count).
export function stripMarkdown(md: string): string {
  return (
    md
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`\n]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6} /gm, "")
      // Emphasis markers only strip at word boundaries so snake_case
      // identifiers and glob*patterns survive intact (CommonMark treats
      // intra-word "_" as literal too).
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/(?<![\w\\])([*_])(?=\S)([^*_\n]*?\S)\1(?!\w)/g, "$2")
      .replace(/~~([\s\S]*?)~~/g, "$1")
      .replace(/^[-*+] \[[ xX]\] /gm, "")
      .replace(/^[-*+] /gm, "")
      .replace(/^\d+\. /gm, "")
      .replace(/^> /gm, "")
      .replace(/[-]{3,}/g, " ")
      .replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, "$1")
      .trim()
  );
}

// Preview text for note cards. stripMarkdown drops fenced code, so a
// code-only note would preview as empty — fall back to the code itself.
export function previewText(md: string): string {
  const prose = stripMarkdown(md);
  if (prose) return prose;
  return md
    .replace(/^```[^\n]*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}
