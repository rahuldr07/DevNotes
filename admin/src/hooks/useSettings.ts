/**
 * useSettings — Global app settings backed by localStorage.
 *
 * Settings are stored as a single JSON object under the key 'devnotes-settings'.
 * Any component can read or update settings. Updates are broadcast via a custom
 * DOM event ('devnotes-settings-change') so all instances stay in sync without
 * needing a Context provider.
 *
 * The command palette (Phase 2) will call toggleSetting('autoSave') directly.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AppSettings {
  autoSave: boolean;
  // Future settings slot in here:
  // soundEnabled: boolean;
  // focusMode: boolean;
  // spellCheck: boolean;
}

const STORAGE_KEY = "devnotes-settings";
const CHANGE_EVENT = "devnotes-settings-change";

const DEFAULTS: AppSettings = {
  autoSave: true,
};

function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: settings }));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(readSettings());
  }, []);

  // Stay in sync if another component updates settings
  useEffect(() => {
    const handler = (e: Event) => {
      setSettings((e as CustomEvent<AppSettings>).detail);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const next = { ...readSettings(), [key]: value };
      writeSettings(next);
      setSettings(next);
    },
    [],
  );

  const toggleSetting = useCallback((key: keyof AppSettings) => {
    const current = readSettings();
    const next = { ...current, [key]: !current[key] };
    writeSettings(next);
    setSettings(next);
  }, []);

  return { settings, updateSetting, toggleSetting };
}
