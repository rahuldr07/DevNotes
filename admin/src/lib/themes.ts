/* ═══════════════════════════════════════════════════════════════════════════
   DEVNOTES THEME REGISTRY — single source of truth for every colorway.

   Each theme is 9 core colors + an accent-foreground + a STYLE AXIS
   (typeface, corner radius, panel shadow, border weight) so switching
   themes re-skins the whole personality of the UI, not just its colors.
   Everything else — the [data-theme] CSS blocks, the shadcn semantic vars,
   the picker swatches and the pre-paint init script — is generated from
   this file, so adding a theme is one entry here, nothing else.

   Core color roles (mirrors the MonkeyType architecture):
   bg       page background          sub     muted text / metadata
   main     primary accent           subAlt  elevated surfaces (cards, popovers)
   text     primary readable text    error   errors, destructive actions
   border   dividers, input borders  hover   hover state backgrounds
   input    input field backgrounds

   Style axis:
   font     "sans" Gellix · "mono" JetBrains Mono · "serif" Lora
   radius   corner radius in px — 0 keeps the sharp workbench look
   shadow   "workbench" inset hairline · "soft" ambient depth · "glow" neon
   panelBorder  border weight for panels/chips (defaults to 1px)

   Every palette shipped here passed WCAG checks (text/bg ≥ 4.5, main/bg ≥ 3,
   accentFg/main ≥ 3) — see the repo history for the validation script.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ThemeId =
  | "serika-dark"
  | "catppuccin-mocha"
  | "catppuccin-latte"
  | "nord"
  | "paper"
  | "midnight"
  | "tokyo-night"
  | "dracula"
  | "gruvbox-dark"
  | "rose-pine"
  | "solarized-dark"
  | "one-dark"
  | "monokai"
  | "synthwave"
  | "matrix"
  | "supabase"
  | "vesper"
  | "kanagawa"
  | "everforest-dark"
  | "solarized-light"
  | "github-light"
  | "rose-pine-dawn"
  | "gruvbox-light"
  | "sakura";

interface ThemeColors {
  bg: string;
  main: string;
  sub: string;
  subAlt: string;
  text: string;
  error: string;
  border: string;
  hover: string;
  input: string;
}

export type ThemeFont = "sans" | "mono" | "serif";
export type ThemeShadow = "workbench" | "soft" | "glow";

export interface ThemeStyle {
  font: ThemeFont;
  radius: number;
  shadow: ThemeShadow;
  panelBorder?: number;
}

/** Exact-compat escape hatch — only the original six themes need these. */
interface ThemeOverrides {
  card?: string;
  secondary?: string;
  sidebar?: string;
  radius?: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  isDark: boolean;
  /** Shown in the first-launch onboarding grid (curated subset). */
  featured?: boolean;
  colors: ThemeColors;
  /** Text on accent-filled controls (primary buttons). */
  accentForeground: string;
  style: ThemeStyle;
  overrides?: ThemeOverrides;
  /** Derived: [bg, main, subAlt, text] — picker swatch strip. */
  swatches: [string, string, string, string];
}

/** The shape older components consume — a subset of ThemeDefinition. */
export type ThemeMeta = Pick<
  ThemeDefinition,
  "id" | "name" | "isDark" | "featured" | "swatches"
>;

export const DEFAULT_THEME_ID: ThemeId = "serika-dark";
export const THEME_STORAGE_KEY = "devnotes-theme";
export const FONT_STORAGE_KEY = "devnotes-font";
export const RADIUS_STORAGE_KEY = "devnotes-radius";

/** UI font stacks — the next/font variables are declared on <html>. */
export const FONT_STACKS: Record<ThemeFont, string> = {
  sans: "var(--font-gellix), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), var(--font-roboto-mono), ui-monospace, SFMono-Regular, monospace",
  serif: "var(--font-lora), Georgia, 'Times New Roman', serif",
};

/* ─── Independent style axes ─────────────────────────────────────────────────
   Font and corner radius are user settings of their own. "auto" means
   "whatever the colorway's designer picked" (the curated pairing in each
   theme's style axis); an explicit choice overrides every colorway via the
   [data-font] / [data-radius] blocks generated below. */

export type FontSetting = "auto" | ThemeFont;

export const RADIUS_PRESETS = {
  sharp: 0,
  soft: 8,
  round: 14,
} as const;

export type RadiusPreset = keyof typeof RADIUS_PRESETS;
export type RadiusSetting = "auto" | RadiusPreset;

export const FONT_LABELS: Record<ThemeFont, string> = {
  sans: "gellix",
  mono: "jetbrains mono",
  serif: "lora",
};

export function isFontSetting(
  value: string | null | undefined,
): value is FontSetting {
  return (
    value === "auto" ||
    value === "sans" ||
    value === "mono" ||
    value === "serif"
  );
}

export function isRadiusSetting(
  value: string | null | undefined,
): value is RadiusSetting {
  return value === "auto" || (value != null && value in RADIUS_PRESETS);
}

/** The style a theme renders with once user overrides are applied. */
export function effectiveStyle(
  theme: ThemeDefinition,
  font: FontSetting,
  radius: RadiusSetting,
): ThemeStyle {
  return {
    ...theme.style,
    font: font === "auto" ? theme.style.font : font,
    radius: radius === "auto" ? theme.style.radius : RADIUS_PRESETS[radius],
  };
}

/** Panel box-shadows. "workbench" is the classic DevNotes inset hairline. */
const PANEL_SHADOWS: Record<ThemeShadow, string> = {
  workbench:
    "0 1px 0 color-mix(in srgb, var(--border-color) 70%, transparent) inset",
  soft: "0 1px 0 color-mix(in srgb, var(--border-color) 70%, transparent) inset, 0 18px 44px -28px rgba(0, 0, 0, 0.55)",
  glow: "0 1px 0 color-mix(in srgb, var(--border-color) 70%, transparent) inset, 0 0 30px -8px color-mix(in srgb, var(--main-color) 50%, transparent)",
};

type ThemeInput = Omit<ThemeDefinition, "swatches">;

const DEFINITIONS: ThemeInput[] = [
  /* ── the original six (colors preserved exactly) ────────────────────── */
  {
    id: "serika-dark",
    name: "Serika Dark",
    isDark: true,
    featured: true,
    colors: {
      bg: "#1a1a1a",
      main: "#e2b714",
      sub: "#646669",
      subAlt: "#2a2a2a",
      text: "#d1d0c5",
      error: "#ca4754",
      border: "rgba(255, 255, 255, 0.06)",
      hover: "#222222",
      input: "transparent",
    },
    accentForeground: "#1a1a1a",
    // The flagship stays the sharp workbench, byte-for-byte.
    style: { font: "sans", radius: 0, shadow: "workbench" },
    overrides: {
      card: "#1a1a1a",
      secondary: "#2a2a2a",
      sidebar: "#1a1a1a",
      radius: "0.25rem",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    isDark: true,
    featured: true,
    colors: {
      bg: "#1e1e2e",
      main: "#cba6f7",
      sub: "#a6adc8",
      subAlt: "#313244",
      text: "#cdd6f4",
      error: "#f38ba8",
      border: "#45475a",
      hover: "#45475a",
      input: "#313244",
    },
    accentForeground: "#1e1e2e",
    style: { font: "sans", radius: 10, shadow: "soft" },
    overrides: { sidebar: "#181825" },
  },
  {
    id: "nord",
    name: "Nord",
    isDark: true,
    featured: true,
    colors: {
      bg: "#2e3440",
      main: "#88c0d0",
      sub: "#4c566a",
      subAlt: "#3b4252",
      text: "#eceff4",
      error: "#bf616a",
      border: "#434c5e",
      hover: "#434c5e",
      input: "#3b4252",
    },
    accentForeground: "#2e3440",
    style: { font: "sans", radius: 6, shadow: "soft" },
    overrides: { sidebar: "#272d3b" },
  },
  {
    id: "midnight",
    name: "Midnight",
    isDark: true,
    featured: true,
    colors: {
      bg: "#09090b",
      main: "#6366f1",
      sub: "#52525b",
      subAlt: "#111113",
      text: "#fafafa",
      error: "#ef4444",
      border: "#27272a",
      hover: "#27272a",
      input: "#18181b",
    },
    accentForeground: "#ffffff",
    style: { font: "sans", radius: 8, shadow: "soft" },
    overrides: { sidebar: "#050507" },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    isDark: false,
    featured: true,
    colors: {
      bg: "#eff1f5",
      main: "#8839ef",
      sub: "#6c6f85",
      subAlt: "#dce0e8",
      text: "#4c4f69",
      error: "#d20f39",
      border: "#ccd0da",
      hover: "#ccd0da",
      input: "#e6e9ef",
    },
    accentForeground: "#ffffff",
    style: { font: "sans", radius: 10, shadow: "soft" },
  },
  {
    id: "paper",
    name: "Paper CLI",
    isDark: false,
    featured: true,
    colors: {
      bg: "#f5f0e8",
      main: "#b5451b",
      sub: "#9a8c7a",
      subAlt: "#e8e0d0",
      text: "#3d2b1f",
      error: "#c0392b",
      border: "#d4c8b8",
      hover: "#ddd5c5",
      input: "#ede8de",
    },
    accentForeground: "#ffffff",
    // Editorial: warm cream + a literary serif face.
    style: { font: "serif", radius: 4, shadow: "soft" },
    overrides: { secondary: "#d4c8b8" },
  },

  /* ── dark colorways ─────────────────────────────────────────────────── */
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    isDark: true,
    featured: true,
    colors: {
      bg: "#1a1b26",
      main: "#7aa2f7",
      sub: "#787fa8",
      subAlt: "#1f2335",
      text: "#c0caf5",
      error: "#f7768e",
      border: "#292e42",
      hover: "#292e42",
      input: "#16161e",
    },
    accentForeground: "#1a1b26",
    style: { font: "sans", radius: 8, shadow: "soft" },
  },
  {
    id: "dracula",
    name: "Dracula",
    isDark: true,
    colors: {
      bg: "#282a36",
      main: "#bd93f9",
      sub: "#8a91bd",
      subAlt: "#343746",
      text: "#f8f8f2",
      error: "#ff5555",
      border: "#44475a",
      hover: "#343746",
      input: "#21222c",
    },
    accentForeground: "#282a36",
    style: { font: "sans", radius: 8, shadow: "soft" },
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    isDark: true,
    colors: {
      bg: "#282828",
      main: "#d79921",
      sub: "#928374",
      subAlt: "#3c3836",
      text: "#ebdbb2",
      error: "#fb4934",
      border: "#504945",
      hover: "#3c3836",
      input: "#32302f",
    },
    accentForeground: "#282828",
    // Retro-terminal: near-sharp corners, chunky 2px panel borders.
    style: { font: "sans", radius: 2, shadow: "workbench", panelBorder: 2 },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    isDark: true,
    featured: true,
    colors: {
      bg: "#191724",
      main: "#ebbcba",
      sub: "#908caa",
      subAlt: "#1f1d2e",
      text: "#e0def4",
      error: "#eb6f92",
      border: "#26233a",
      hover: "#26233a",
      input: "#1f1d2e",
    },
    accentForeground: "#191724",
    style: { font: "sans", radius: 12, shadow: "soft" },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    isDark: true,
    colors: {
      bg: "#002b36",
      main: "#2aa198",
      sub: "#7c9299",
      subAlt: "#073642",
      text: "#c8d2d2",
      error: "#dc322f",
      border: "#0d4654",
      hover: "#073642",
      input: "#063441",
    },
    accentForeground: "#002b36",
    style: { font: "sans", radius: 4, shadow: "workbench" },
  },
  {
    id: "one-dark",
    name: "One Dark",
    isDark: true,
    colors: {
      bg: "#282c34",
      main: "#61afef",
      sub: "#8b93a3",
      subAlt: "#21252b",
      text: "#abb2bf",
      error: "#e06c75",
      border: "#3a3f4b",
      hover: "#2c313a",
      input: "#21252b",
    },
    accentForeground: "#282c34",
    style: { font: "sans", radius: 6, shadow: "soft" },
  },
  {
    id: "monokai",
    name: "Monokai",
    isDark: true,
    colors: {
      bg: "#272822",
      main: "#a6e22e",
      sub: "#90917e",
      subAlt: "#32332b",
      text: "#f8f8f2",
      error: "#f92672",
      border: "#49483e",
      hover: "#3e3d32",
      input: "#2d2e27",
    },
    accentForeground: "#272822",
    style: { font: "sans", radius: 2, shadow: "workbench" },
  },
  {
    id: "synthwave",
    name: "Synthwave '84",
    isDark: true,
    colors: {
      bg: "#241b2f",
      main: "#ff7edb",
      sub: "#9d95bd",
      subAlt: "#2a2139",
      text: "#f0eff1",
      error: "#fe4450",
      border: "#3b2f52",
      hover: "#34294a",
      input: "#2f2440",
    },
    accentForeground: "#241b2f",
    // Neon: panels glow in the accent pink.
    style: { font: "sans", radius: 8, shadow: "glow" },
  },
  {
    id: "matrix",
    name: "Matrix",
    isDark: true,
    colors: {
      bg: "#0a0f0a",
      main: "#2bff64",
      sub: "#5d8a68",
      subAlt: "#101810",
      text: "#c8facc",
      error: "#ff5555",
      border: "#1d2f1f",
      hover: "#142014",
      input: "#0e150e",
    },
    accentForeground: "#0a0f0a",
    // Full terminal: monospace UI, razor corners, phosphor glow.
    style: { font: "mono", radius: 0, shadow: "glow" },
  },
  {
    id: "supabase",
    name: "Supabase",
    isDark: true,
    colors: {
      bg: "#0c0c0c",
      main: "#3ecf8e",
      sub: "#8f8f8f",
      subAlt: "#171717",
      text: "#ededed",
      error: "#ef4444",
      border: "#2e2e2e",
      hover: "#1f1f1f",
      input: "#171717",
    },
    accentForeground: "#0c0c0c",
    style: { font: "sans", radius: 6, shadow: "soft" },
  },
  {
    id: "vesper",
    name: "Vesper",
    isDark: true,
    colors: {
      bg: "#101010",
      main: "#ffc799",
      sub: "#8b8b8b",
      subAlt: "#161616",
      text: "#f0f0f0",
      error: "#ff8080",
      border: "#282828",
      hover: "#1f1f1f",
      input: "#161616",
    },
    accentForeground: "#101010",
    // Minimal terminal: monospace UI, dead-sharp.
    style: { font: "mono", radius: 0, shadow: "workbench" },
  },
  {
    id: "kanagawa",
    name: "Kanagawa",
    isDark: true,
    colors: {
      bg: "#1f1f28",
      main: "#7e9cd8",
      sub: "#8a8980",
      subAlt: "#2a2a37",
      text: "#dcd7ba",
      error: "#e46876",
      border: "#363646",
      hover: "#2a2a37",
      input: "#16161d",
    },
    accentForeground: "#1f1f28",
    style: { font: "sans", radius: 4, shadow: "soft" },
  },
  {
    id: "everforest-dark",
    name: "Everforest Dark",
    isDark: true,
    colors: {
      bg: "#2d353b",
      main: "#a7c080",
      sub: "#8b969a",
      subAlt: "#343f44",
      text: "#d3c6aa",
      error: "#e67e80",
      border: "#475258",
      hover: "#3d484d",
      input: "#323c41",
    },
    accentForeground: "#2d353b",
    style: { font: "sans", radius: 8, shadow: "soft" },
  },

  /* ── light colorways ────────────────────────────────────────────────── */
  {
    id: "solarized-light",
    name: "Solarized Light",
    isDark: false,
    colors: {
      bg: "#fdf6e3",
      main: "#b26800",
      sub: "#78838a",
      subAlt: "#eee8d5",
      text: "#3c4a4f",
      error: "#dc322f",
      border: "#ddd6c1",
      hover: "#eee8d5",
      input: "#f7f0dd",
    },
    accentForeground: "#ffffff",
    style: { font: "serif", radius: 4, shadow: "workbench" },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    isDark: false,
    colors: {
      bg: "#ffffff",
      main: "#0969da",
      sub: "#656d76",
      subAlt: "#f6f8fa",
      text: "#1f2328",
      error: "#cf222e",
      border: "#d1d9e0",
      hover: "#eff2f5",
      input: "#f6f8fa",
    },
    accentForeground: "#ffffff",
    style: { font: "sans", radius: 6, shadow: "soft" },
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine Dawn",
    isDark: false,
    colors: {
      bg: "#faf4ed",
      main: "#b4637a",
      sub: "#797593",
      subAlt: "#fffaf3",
      text: "#575279",
      error: "#c62b45",
      border: "#dfdad9",
      hover: "#f4ede8",
      input: "#fffaf3",
    },
    accentForeground: "#ffffff",
    style: { font: "serif", radius: 12, shadow: "soft" },
  },
  {
    id: "gruvbox-light",
    name: "Gruvbox Light",
    isDark: false,
    colors: {
      bg: "#fbf1c7",
      main: "#a75f0a",
      sub: "#7c6f64",
      subAlt: "#ebdbb2",
      text: "#3c3836",
      error: "#9d0006",
      border: "#d5c4a1",
      hover: "#ebdbb2",
      input: "#f2e5bc",
    },
    accentForeground: "#ffffff",
    style: { font: "sans", radius: 2, shadow: "workbench", panelBorder: 2 },
  },
  {
    id: "sakura",
    name: "Sakura",
    isDark: false,
    colors: {
      bg: "#fdf4f8",
      main: "#c2255c",
      sub: "#8f6c7f",
      subAlt: "#f7e6ee",
      text: "#3d1f30",
      error: "#c92a2a",
      border: "#eed3e0",
      hover: "#f7e6ee",
      input: "#fbeef4",
    },
    accentForeground: "#ffffff",
    // Bubbly: the roundest corners in the roster.
    style: { font: "sans", radius: 14, shadow: "soft" },
  },
];

export const THEMES: ThemeDefinition[] = DEFINITIONS.map((theme) => ({
  ...theme,
  swatches: [
    theme.colors.bg,
    theme.colors.main,
    theme.colors.subAlt,
    theme.colors.text,
  ],
}));

const THEME_INDEX = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return (
    (id && THEME_INDEX.get(id as ThemeId)) ||
    (THEME_INDEX.get(DEFAULT_THEME_ID) as ThemeDefinition)
  );
}

export function isThemeId(id: string | null | undefined): id is ThemeId {
  return Boolean(id && THEME_INDEX.has(id as ThemeId));
}

/* ─── CSS generation ─────────────────────────────────────────────────────── */

function themeBlock(theme: ThemeDefinition): string {
  const { colors, accentForeground, overrides, style } = theme;
  const card = overrides?.card ?? colors.subAlt;
  const secondary = overrides?.secondary ?? colors.hover;
  const sidebar =
    overrides?.sidebar ??
    (theme.isDark
      ? `color-mix(in srgb, ${colors.bg} 88%, black)`
      : colors.input);
  const radius = overrides?.radius ?? "0.625rem";
  // The default theme also styles :root so the page renders sanely even if
  // the init script never runs (e.g. JS disabled).
  const selector =
    theme.id === DEFAULT_THEME_ID
      ? `:root,\n[data-theme="${theme.id}"]`
      : `[data-theme="${theme.id}"]`;

  return `${selector} {
  --bg-color: ${colors.bg};
  --main-color: ${colors.main};
  --sub-color: ${colors.sub};
  --sub-alt-color: ${colors.subAlt};
  --text-color: ${colors.text};
  --error-color: ${colors.error};
  --border-color: ${colors.border};
  --hover-color: ${colors.hover};
  --input-bg: ${colors.input};
  --focus-ring: ${colors.main};
  --radius: ${radius};

  --ui-font-sans: ${FONT_STACKS[style.font]};
  --ui-radius: ${style.radius}px;
  --ui-panel-shadow: ${PANEL_SHADOWS[style.shadow]};
  --ui-panel-border: ${style.panelBorder ?? 1}px;

  --background: ${colors.bg};
  --foreground: ${colors.text};
  --card: ${card};
  --card-foreground: ${colors.text};
  --popover: ${colors.subAlt};
  --popover-foreground: ${colors.text};
  --primary: ${colors.main};
  --primary-foreground: ${accentForeground};
  --secondary: ${secondary};
  --secondary-foreground: ${colors.text};
  --muted: ${colors.subAlt};
  --muted-foreground: ${colors.sub};
  --accent: ${colors.hover};
  --accent-foreground: ${colors.text};
  --destructive: ${colors.error};
  --border: ${colors.border};
  --input: ${colors.input};
  --ring: ${colors.main};
  --sidebar: ${sidebar};
  --sidebar-foreground: ${colors.text};
  --sidebar-primary: ${colors.main};
  --sidebar-primary-foreground: ${accentForeground};
  --sidebar-accent: ${colors.subAlt};
  --sidebar-accent-foreground: ${colors.text};
  --sidebar-border: ${colors.border};
  --sidebar-ring: ${colors.main};
}`;
}

/**
 * Full theme stylesheet: one block per theme, then the app-level alias vars.
 * The alias block must come last — it deliberately re-points --accent (which
 * each theme block sets to the shadcn hover value) at the main accent color,
 * relying on equal specificity + source order.
 */
export function buildThemeCss(): string {
  const blocks = THEMES.map(themeBlock).join("\n\n");
  // User-chosen font/corner overrides. Emitted AFTER the theme blocks so an
  // explicit [data-font]/[data-radius] on <html> beats the colorway's own
  // pairing at equal specificity; when the attribute is absent ("auto") the
  // theme block's value stands.
  const fontOverrides = (Object.keys(FONT_STACKS) as ThemeFont[])
    .map(
      (font) => `[data-font="${font}"] {
  --ui-font-sans: ${FONT_STACKS[font]};
}`,
    )
    .join("\n\n");
  const radiusOverrides = (
    Object.entries(RADIUS_PRESETS) as [RadiusPreset, number][]
  )
    .map(
      ([preset, px]) => `[data-radius="${preset}"] {
  --ui-radius: ${px}px;
}`,
    )
    .join("\n\n");
  const alias = `:root,
[data-theme] {
  --bg: var(--bg-color);
  --bg-secondary: var(--sub-alt-color);
  --text-primary: var(--text-color);
  --text-secondary: var(--sub-color);
  --accent: var(--main-color);
  --accent-hover: color-mix(in srgb, var(--main-color) 82%, #000);
  --error: var(--error-color);
  --success: #4caf50;
  --border: var(--border-color);
}`;
  return `${blocks}\n\n${fontOverrides}\n\n${radiusOverrides}\n\n${alias}\n`;
}

/**
 * Pre-paint init script: applies the saved theme before first paint so a
 * reload never flashes the default colorway. Inlined as a blocking script
 * at the top of <body>.
 */
export function buildThemeInitScript(): string {
  const darkById = Object.fromEntries(
    THEMES.map((theme) => [theme.id, theme.isDark ? 1 : 0]),
  );
  const fonts = JSON.stringify(Object.keys(FONT_STACKS));
  const radii = JSON.stringify(Object.keys(RADIUS_PRESETS));
  return `(function(){var m=${JSON.stringify(darkById)};var t=null,f=null,r=null;try{t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});f=localStorage.getItem(${JSON.stringify(
    FONT_STORAGE_KEY,
  )});r=localStorage.getItem(${JSON.stringify(
    RADIUS_STORAGE_KEY,
  )})}catch(e){}if(!t||!(t in m)){t=${JSON.stringify(
    DEFAULT_THEME_ID,
  )}}var d=document.documentElement;d.setAttribute("data-theme",t);d.classList.toggle("dark",m[t]===1);if(f&&${fonts}.indexOf(f)>-1){d.setAttribute("data-font",f)}if(r&&${radii}.indexOf(r)>-1){d.setAttribute("data-radius",r)}})();`;
}
