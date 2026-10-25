import type { Theme } from '../types';

// Light and Dark are hand-written in variables.css. The premium themes below
// are described by a small palette each and turned into the same set of CSS
// custom properties at startup, so adding a theme is one entry here. Hex
// values follow each theme's published palette (Catppuccin, Nord, Dracula,
// Rose Pine, Tokyo Night), nudged where needed so body text stays readable.

export interface ThemeMeta {
  id: Theme;
  label: string;
  premium: boolean;
  /** Preview swatch for the picker. */
  swatch: string;
}

interface Palette {
  id: Theme;
  label: string;
  mode: 'dark' | 'light';
  /** Page gradient stops, 135deg. */
  gradient: [string, string, string];
  /** Tint for translucent cards (dark themes). */
  surface: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  accent: string;
  /** Semantic colors for priority and status pills. */
  low: string;
  medium: string;
  high: string;
  progress: string;
  review: string;
}

const PALETTES: Palette[] = [
  {
    id: 'catppuccin-mocha',
    label: 'Catppuccin Mocha',
    mode: 'dark',
    gradient: ['#11111b', '#1e1e2e', '#313244'],
    surface: '#45475a',
    ink: '#cdd6f4',
    inkMuted: '#a6adc8',
    inkFaint: '#7f849c',
    accent: '#cba6f7',
    low: '#a6e3a1',
    medium: '#fab387',
    high: '#f38ba8',
    progress: '#b4befe',
    review: '#74c7ec',
  },
  {
    id: 'catppuccin-latte',
    label: 'Catppuccin Latte',
    mode: 'light',
    gradient: ['#eff1f5', '#e6e9ef', '#dce0e8'],
    surface: '#ccd0da',
    ink: '#4c4f69',
    inkMuted: '#6c6f85',
    inkFaint: '#9ca0b0',
    accent: '#8839ef',
    low: '#40a02b',
    medium: '#df8e1d',
    high: '#d20f39',
    progress: '#8839ef',
    review: '#1e66f5',
  },
  {
    id: 'nord',
    label: 'Nord',
    mode: 'dark',
    gradient: ['#2e3440', '#3b4252', '#434c5e'],
    surface: '#4c566a',
    ink: '#eceff4',
    inkMuted: '#d8dee9',
    inkFaint: '#9aa5b8',
    accent: '#88c0d0',
    low: '#a3be8c',
    medium: '#ebcb8b',
    high: '#e0808a',
    progress: '#b48ead',
    review: '#81a1c1',
  },
  {
    id: 'dracula',
    label: 'Dracula',
    mode: 'dark',
    gradient: ['#21222c', '#282a36', '#343746'],
    surface: '#44475a',
    ink: '#f8f8f2',
    inkMuted: '#c3c6dc',
    inkFaint: '#8b93b5',
    accent: '#bd93f9',
    low: '#50fa7b',
    medium: '#ffb86c',
    high: '#ff5555',
    progress: '#ff79c6',
    review: '#8be9fd',
  },
  {
    id: 'rose-pine',
    label: 'Rosé Pine',
    mode: 'dark',
    gradient: ['#191724', '#1f1d2e', '#26233a'],
    surface: '#403d52',
    ink: '#e0def4',
    inkMuted: '#a29fbd',
    inkFaint: '#6e6a86',
    accent: '#ebbcba',
    low: '#9ccfd8',
    medium: '#f6c177',
    high: '#eb6f92',
    progress: '#c4a7e7',
    review: '#7fb6c9',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    mode: 'dark',
    gradient: ['#16161e', '#1a1b26', '#24283b'],
    surface: '#414868',
    ink: '#c0caf5',
    inkMuted: '#a9b1d6',
    inkFaint: '#787c99',
    accent: '#7aa2f7',
    low: '#9ece6a',
    medium: '#e0af68',
    high: '#f7768e',
    progress: '#bb9af7',
    review: '#7dcfff',
  },
];

const swatchOf = (g: [string, string, string]) => `linear-gradient(135deg, ${g[0]} 0%, ${g[1]} 50%, ${g[2]} 100%)`;

export const THEMES: ThemeMeta[] = [
  { id: 'light', label: 'Light', premium: false, swatch: 'linear-gradient(135deg, #fce9d8 0%, #f6dce3 45%, #e3d6f2 100%)' },
  { id: 'dark', label: 'Dark', premium: false, swatch: 'linear-gradient(135deg, #16212e 0%, #1f2f45 50%, #28405e 100%)' },
  ...PALETTES.map((p) => ({ id: p.id, label: p.label, premium: true, swatch: swatchOf(p.gradient) })),
];

export function themeMeta(id: Theme): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[1];
}

export const isPremiumTheme = (id: Theme) => themeMeta(id).premium;

// ---------- palette -> CSS ----------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

const rgba = (hex: string, alpha: number) => `rgba(${rgb(hex).join(', ')}, ${alpha})`;

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function cssFor(p: Palette): string {
  const dark = p.mode === 'dark';
  const accentContrast = luminance(p.accent) > 0.4 ? '#1a1a1e' : '#ffffff';
  // The high-contrast surface (stat card, primary buttons): a tint of the
  // theme's own colors, so it follows the theme instead of staying near-black.
  const cta = dark ? mix(p.surface, p.accent, 0.2) : mix(p.ink, p.accent, 0.15);
  const ctaInk = dark ? mix(p.ink, '#ffffff', 0.4) : p.gradient[0];
  const pill = (color: string) =>
    dark
      ? `--ws-PILL-bg: ${rgba(color, 0.18)}; --ws-PILL-text: ${color};`
      : `--ws-PILL-bg: ${mix(color, '#ffffff', 0.82)}; --ws-PILL-text: ${color};`;
  const pills = [
    ['low', p.low],
    ['medium', p.medium],
    ['high', p.high],
    ['todo', p.inkMuted],
    ['inprogress', p.progress],
    ['inreview', p.review],
    ['done', p.low],
  ]
    .map(([name, color]) => pill(color).replace(/PILL/g, name))
    .join('\n  ');

  return `:root[data-theme='${p.id}'] {
  --ion-color-primary: ${p.accent};
  --ion-color-primary-rgb: ${rgb(p.accent).join(', ')};
  --ion-color-primary-contrast: ${accentContrast};
  --ion-color-primary-contrast-rgb: ${rgb(accentContrast).join(', ')};
  --ion-color-primary-shade: ${mix(p.accent, '#000000', 0.15)};
  --ion-color-primary-tint: ${mix(p.accent, '#ffffff', 0.2)};
  --ws-bg-gradient: ${swatchOf(p.gradient)};
  --ws-glass-bg: ${dark ? rgba(p.surface, 0.4) : 'rgba(255, 255, 255, 0.62)'};
  --ws-glass-bg-strong: ${dark ? rgba(p.surface, 0.58) : 'rgba(255, 255, 255, 0.82)'};
  --ws-glass-border: ${dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.75)'};
  --ws-glass-shadow: ${dark ? '0 12px 32px rgba(0, 0, 0, 0.35)' : `0 12px 32px ${rgba(p.ink, 0.14)}`};
  --ws-glass-shadow-sm: ${dark ? '0 6px 18px rgba(0, 0, 0, 0.25)' : `0 6px 18px ${rgba(p.ink, 0.1)}`};
  --ws-dark: ${cta};
  --ws-dark-raised: ${mix(cta, '#ffffff', 0.08)};
  --ws-popup-bg: ${dark ? mix(p.gradient[1], '#ffffff', 0.07) : '#fbfbfe'};
  --ws-dark-ink: ${ctaInk};
  --ws-dark-ink-muted: ${rgba(ctaInk, 0.65)};
  --ws-amber: ${p.accent};
  --ws-amber-strong: ${p.accent};
  --ws-amber-dim: ${rgba(p.accent, 0.24)};
  --ws-ink: ${p.ink};
  --ws-ink-muted: ${p.inkMuted};
  --ws-ink-faint: ${p.inkFaint};
  ${pills}
}`;
}

export function premiumThemeCss(): string {
  return PALETTES.map(cssFor).join('\n\n');
}
