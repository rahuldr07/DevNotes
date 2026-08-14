"""Server-side text derivation for list payloads.

Public list endpoints used to ship every note's full markdown so the browser
could compute a two-line preview and a reading time from it. A profile with
fifty long notes was megabytes of body to render a few hundred characters.
These helpers move that derivation to the server, which then sends only what
the list actually renders.

The stripping is deliberately coarse — it feeds previews and word counts, not
rendering. `admin/src/lib/notes.ts` keeps the precise version for the editor.
"""
import re

WORDS_PER_MINUTE = 220

_FENCED_CODE = re.compile(r"```[\s\S]*?```")
_INLINE_CODE = re.compile(r"`([^`\n]+)`")
_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_HEADING = re.compile(r"(?m)^#{1,6}\s+")
_QUOTE = re.compile(r"(?m)^>\s?")
_LIST_MARKER = re.compile(r"(?m)^[-*+]\s+(\[[ xX]\]\s+)?")
_ORDERED_MARKER = re.compile(r"(?m)^\d+\.\s+")
_EMPHASIS = re.compile(r"(\*\*|__|\*|_|~~)")
_RULE = re.compile(r"(?m)^\s*([-*_])\1{2,}\s*$")
_WHITESPACE = re.compile(r"\s+")


def strip_markdown(markdown: str) -> str:
    text = markdown or ""
    text = _FENCED_CODE.sub(" ", text)
    text = _IMAGE.sub(" ", text)
    text = _LINK.sub(r"\1", text)
    text = _INLINE_CODE.sub(r"\1", text)
    text = _RULE.sub(" ", text)
    text = _HEADING.sub("", text)
    text = _QUOTE.sub("", text)
    text = _LIST_MARKER.sub("", text)
    text = _ORDERED_MARKER.sub("", text)
    text = _EMPHASIS.sub("", text)
    return _WHITESPACE.sub(" ", text).strip()


def preview_text(markdown: str, length: int = 280) -> str:
    """Short plain-text excerpt for a card.

    Falls back to the raw body when a note is nothing but a fenced code block,
    so code-only snippets do not preview as empty.
    """
    prose = strip_markdown(markdown)
    if not prose:
        prose = _WHITESPACE.sub(
            " ", re.sub(r"(?m)^```[^\n]*$", " ", markdown or "")
        ).strip()
    if len(prose) <= length:
        return prose
    return f"{prose[:length].rstrip()}..."


def reading_minutes(markdown: str) -> int:
    words = len([word for word in strip_markdown(markdown).split(" ") if word])
    return max(1, -(-words // WORDS_PER_MINUTE))
