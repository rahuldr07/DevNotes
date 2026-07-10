"use client";

import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUT_GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "navigate",
    shortcuts: [
      { keys: ["g", "d"], label: "notes dashboard" },
      { keys: ["g", "s"], label: "snippet vault" },
      { keys: ["g", "e"], label: "explore" },
      { keys: ["g", "a"], label: "ask workspace" },
      { keys: ["g", "p"], label: "settings / profile" },
      { keys: ["g", "t"], label: "theme studio" },
    ],
  },
  {
    title: "create + find",
    shortcuts: [
      { keys: ["n"], label: "new note" },
      { keys: ["ctrl", "k"], label: "command palette" },
      { keys: ["/"], label: "search" },
    ],
  },
  {
    title: "quick capture",
    shortcuts: [
      { keys: ["enter"], label: "save (note mode)" },
      { keys: ["shift", "enter"], label: "newline" },
      { keys: ["ctrl", "enter"], label: "save (always)" },
    ],
  },
  {
    title: "help",
    shortcuts: [
      { keys: ["?"], label: "this overlay" },
      { keys: ["esc"], label: "close" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-none border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] lowercase text-[var(--text-secondary)]">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="onboarding-dialog max-w-xl overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--border)] px-6 pb-4 pt-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            <Keyboard size={14} className="text-[var(--accent)]" />
            keyboard shortcuts
          </div>
          <DialogTitle className="text-left text-xl font-medium lowercase text-[var(--text-primary)]">
            drive it without the mouse
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[var(--text-secondary)]">
            Chords work anywhere outside an input. Press{" "}
            <span className="font-mono text-[var(--accent)]">g</span> then a
            letter to jump.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="bg-[var(--bg)] p-5">
              <p className="type-eyebrow text-[var(--text-secondary)]">
                {group.title}
              </p>
              <ul className="mt-3 space-y-2.5">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-[var(--text-secondary)]">
                      {shortcut.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={`${shortcut.label}-${key}`}>{key}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
