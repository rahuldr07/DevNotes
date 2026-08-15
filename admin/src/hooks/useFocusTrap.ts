"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps Tab inside an open overlay and restores focus on close.
 *
 * Radix does this for the dialogs built on its primitives; the hand-rolled
 * overlays (the version drawer) had no trap at all, so Tab walked straight
 * out into the page behind them — the content a modal exists to make
 * unreachable — and closing left focus on `<body>`, stranding keyboard users
 * at the top of the document.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    // Move focus in, so the first Tab lands inside rather than after.
    const focusFirst = () => {
      const target =
        container?.querySelector<HTMLElement>(FOCUSABLE) ?? container;
      target?.focus?.();
    };
    const timer = window.setTimeout(focusFirst, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;

      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      // Return focus to whatever opened the overlay.
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}
