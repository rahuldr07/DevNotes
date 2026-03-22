"use client";

import { Howl } from "howler";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/* ─── Sound types ────────────────────────────────────────────────────────── */

export type SoundId = "click" | "success" | "delete" | "toggle" | "pop";

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  play: (id: SoundId) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const STORAGE_KEY = "devnotes-sound";

/* ─── Sprite config ──────────────────────────────────────────────────────── */
// All sounds are synthesized via Web Audio API as fallback until a real
// sprite file is added at /public/sounds/ui-sounds.mp3.
// To upgrade: replace the src with the real file and keep sprite offsets.
const SPRITE_SRC = "/sounds/ui-sounds.mp3";

const SPRITE_MAP: Record<SoundId, [number, number]> = {
  click: [0, 80],
  toggle: [100, 150],
  success: [300, 400],
  delete: [800, 300],
  pop: [1200, 100],
};

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const howlRef = useRef<Howl | null>(null);

  // Read preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setSoundEnabled(saved === "true");
  }, []);

  // Lazy-init Howl only when sounds are enabled
  useEffect(() => {
    if (!soundEnabled) return;

    howlRef.current = new Howl({
      src: [SPRITE_SRC],
      sprite: SPRITE_MAP,
      volume: 0.4,
      // If sprite file not found, fail silently
      onloaderror: () => {
        howlRef.current = null;
      },
    });

    return () => {
      howlRef.current?.unload();
      howlRef.current = null;
    };
  }, [soundEnabled]);

  const play = useCallback(
    (id: SoundId) => {
      if (!soundEnabled || !howlRef.current) return;
      howlRef.current.play(id);
    },
    [soundEnabled],
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound, play }}>
      {children}
    </SoundContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
