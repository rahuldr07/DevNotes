"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BLOCK_GROUP_LABELS,
  type EditorBlock,
} from "@/components/ui/editor/blocks";

export interface SlashMenuHandle {
  /** Returns true when the menu consumed the key. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export interface SlashMenuProps {
  items: EditorBlock[];
  command: (block: EditorBlock) => void;
  /**
   * Reports the highlighted option's DOM id. DOM focus stays in the document
   * — the caret has to keep blinking where the text will land — so per the
   * ARIA combobox pattern the *editor* carries `aria-activedescendant`, and
   * the extension is what can reach `editor.view.dom` to set it.
   */
  onActiveOptionChange?: (optionId: string | null) => void;
}

export const SLASH_LISTBOX_ID = "devnotes-slash-listbox";

const optionId = (block: EditorBlock) => `devnotes-slash-option-${block.id}`;

/**
 * The list rendered by the `/` suggestion plugin: a listbox whose active row
 * is driven by the editor's keymap rather than by focus.
 */
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ items, command, onActiveOptionChange }, ref) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // A new result set starts at the top again. `items` is the trigger, not
    // a value the effect reads — which is what the rule measures.
    // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the result set changes
    useEffect(() => {
      setActiveIndex(0);
    }, [items]);

    useLayoutEffect(() => {
      const active = items[activeIndex];
      onActiveOptionChange?.(active ? optionId(active) : null);
      // Browsers do not scroll aria-activedescendant targets into view the
      // way they do for focused elements — that is the caller's job.
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, items, onActiveOptionChange]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (items.length === 0) return false;

        switch (event.key) {
          case "ArrowDown":
            setActiveIndex((index) => (index + 1) % items.length);
            return true;
          case "ArrowUp":
            setActiveIndex(
              (index) => (index - 1 + items.length) % items.length,
            );
            return true;
          case "Home":
            setActiveIndex(0);
            return true;
          case "End":
            setActiveIndex(items.length - 1);
            return true;
          case "Enter":
          case "Tab": {
            const block = items[activeIndex];
            if (!block) return false;
            command(block);
            return true;
          }
          default:
            return false;
        }
      },
    }));

    if (items.length === 0) {
      return (
        <div
          id={SLASH_LISTBOX_ID}
          className="slash-menu"
          role="listbox"
          aria-label="Insert block"
        >
          <p className="slash-empty">no block matches that</p>
        </div>
      );
    }

    let lastGroup: EditorBlock["group"] | null = null;

    return (
      <div
        id={SLASH_LISTBOX_ID}
        className="slash-menu"
        role="listbox"
        aria-label="Insert block"
      >
        {items.map((block, index) => {
          const Icon = block.icon;
          const showGroup = block.group !== lastGroup;
          lastGroup = block.group;

          return (
            <div key={block.id}>
              {showGroup && (
                <p className="slash-group">{BLOCK_GROUP_LABELS[block.group]}</p>
              )}
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                id={optionId(block)}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={-1}
                className={`slash-item${index === activeIndex ? " is-active" : ""}`}
                // Selecting must not pull focus out of the document.
                onMouseDown={(event) => {
                  event.preventDefault();
                  command(block);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <Icon size={14} />
                <span className="slash-label">{block.label}</span>
                {block.hint && <span className="slash-hint">{block.hint}</span>}
              </button>
            </div>
          );
        })}
      </div>
    );
  },
);

SlashMenu.displayName = "SlashMenu";
