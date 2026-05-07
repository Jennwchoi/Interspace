/**
 * Interspace Design System — Token Architecture
 *
 * Three-layer structure:
 *   1. Primitive   — raw values; no semantic meaning
 *   2. Semantic    — purpose-bound CSS variable references; theme-aware
 *   3. Component   — UI-domain compositions built from the layers above
 *
 * AI-domain tokens live in their own namespace to make the AI pipeline's
 * visual contract explicit and auditable.
 *
 * Usage:
 *   import { color, semantic, canvas, ai, motion } from '@/design-system/tokens';
 */

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Wraps a CSS custom property name for runtime theme resolution. */
export const cssVar = (name: string): string => `var(--${name})`;


// ─── Layer 1: Primitive Tokens ────────────────────────────────────────────────

export const color = {
  neutral: {
    0:    '#ffffff',
    50:   'oklch(0.985 0 0)',
    100:  'oklch(0.97 0 0)',
    200:  'oklch(0.922 0 0)',
    300:  'oklch(0.87 0 0)',
    400:  'oklch(0.708 0 0)',
    500:  'oklch(0.556 0 0)',
    600:  'oklch(0.439 0 0)',
    700:  'oklch(0.371 0 0)',
    800:  'oklch(0.269 0 0)',
    900:  'oklch(0.205 0 0)',
    1000: '#000000',
  },
  blue: {
    50:  'oklch(0.97 0.014 254.604)',
    200: 'oklch(0.882 0.059 254.128)',
    300: 'oklch(0.809 0.105 251.813)',
    400: 'oklch(0.707 0.165 254.624)',
    500: 'oklch(0.623 0.214 259.815)',
  },

  /**
   * Named drawing palette — the 16 swatches shown in the color picker.
   * Naming by role (not hex) makes intentional palette changes diff-readable.
   */
  drawing: {
    black:    '#000000',
    white:    '#FFFFFF',
    red:      '#FF0000',
    green:    '#00FF00',
    blue:     '#0000FF',
    yellow:   '#FFFF00',
    magenta:  '#FF00FF',
    cyan:     '#00FFFF',
    coral:    '#FF6B6B',
    teal:     '#4ECDC4',
    sky:      '#45B7D1',
    salmon:   '#FFA07A',
    mint:     '#98D8C8',
    gold:     '#F7DC6F',
    lavender: '#BB8FCE',
    slate:    '#85929E',
  },
} as const;

export const typography = {
  fontFamily: {
    sans:         'ui-sans-serif, system-ui, sans-serif',
    mono:         'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    interLight:   "'Inter:Light', sans-serif",
    interRegular: "'Inter:Regular', sans-serif",
  },
  fontSize: {
    '2xs': '10px',
    xs:    '0.75rem',   // 12px
    sm:    '0.875rem',  // 14px
    base:  '1rem',      // 16px
    lg:    '1.125rem',  // 18px
    xl:    '1.25rem',   // 20px
    '2xl': '1.5rem',    // 24px
  },
  fontWeight: {
    light:  300,
    normal: 400,
    medium: 500,
  },
  lineHeight: {
    none:    1,
    tight:   1.25,
    normal:  1.4,
    relaxed: 1.625,
  },
} as const;

export const radius = {
  sm:      '0.25rem',  // 4px
  md:      '0.375rem', // 6px
  DEFAULT: '0.625rem', // 10px  — base --radius token
  lg:      '0.625rem',
  xl:      '1rem',     // 16px
  full:    '9999px',
} as const;

export const spacing = {
  px:  '1px',
  0:   '0',
  1:   '0.25rem',  // 4px
  2:   '0.5rem',   // 8px
  3:   '0.75rem',  // 12px
  4:   '1rem',     // 16px
  5:   '1.25rem',  // 20px
  6:   '1.5rem',   // 24px
  8:   '2rem',     // 32px
  10:  '2.5rem',   // 40px
  12:  '3rem',     // 48px
} as const;

export const shadow = {
  sm:  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md:  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg:  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl:  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;


// ─── Layer 2: Semantic Tokens ─────────────────────────────────────────────────
// All values reference CSS custom properties so they resolve correctly in both
// light and dark themes without any JavaScript involvement.

export const semantic = {
  color: {
    background:          cssVar('background'),
    foreground:          cssVar('foreground'),
    card:                cssVar('card'),
    cardForeground:      cssVar('card-foreground'),
    popover:             cssVar('popover'),
    popoverForeground:   cssVar('popover-foreground'),
    primary:             cssVar('primary'),
    primaryForeground:   cssVar('primary-foreground'),
    secondary:           cssVar('secondary'),
    secondaryForeground: cssVar('secondary-foreground'),
    muted:               cssVar('muted'),
    mutedForeground:     cssVar('muted-foreground'),
    accent:              cssVar('accent'),
    accentForeground:    cssVar('accent-foreground'),
    destructive:         cssVar('destructive'),
    destructiveForeground: cssVar('destructive-foreground'),
    border:              cssVar('border'),
    input:               cssVar('input'),
    ring:                cssVar('ring'),
  },
  radius: {
    sm: cssVar('radius-sm'),
    md: cssVar('radius-md'),
    lg: cssVar('radius-lg'),
    xl: cssVar('radius-xl'),
  },
} as const;


// ─── Layer 3: Component Tokens ────────────────────────────────────────────────

/** Canvas drawing surface and tool configuration. */
export const canvas = {
  background: color.neutral[0],

  /** The 16 swatches shown in the color picker, in display order. */
  defaultPalette: [
    color.drawing.black,   color.drawing.white,
    color.drawing.red,     color.drawing.green,
    color.drawing.blue,    color.drawing.yellow,
    color.drawing.magenta, color.drawing.cyan,
    color.drawing.coral,   color.drawing.teal,
    color.drawing.sky,     color.drawing.salmon,
    color.drawing.mint,    color.drawing.gold,
    color.drawing.lavender,color.drawing.slate,
  ] as const,

  /** Brush diameter in pixels — slider range is 1–50. */
  brushSize: {
    hairline: 1,
    fine:     4,
    medium:   12,
    DEFAULT:  18,  // matches useState initial value in App.tsx
    bold:     28,
    max:      50,
  },

  /** Eraser diameter in pixels. */
  eraserSize: {
    precise:  10,
    standard: 20,
    large:    40,
  },
} as const;

/** Floating toolbar geometry. */
export const toolbar = {
  iconSize:      '32px',
  itemGap:       spacing[2],
  backdropBlur:  '8px',
  borderRadius:  radius.xl,
} as const;

/** AI chat panel layout. */
export const chat = {
  panelWidth:     '320px',
  bubbleMaxWidth: '85%',
  typography: {
    message:   typography.fontSize.sm,
    timestamp: typography.fontSize['2xs'],
    label:     typography.fontSize.xs,
  },
} as const;

/**
 * 3D-conversion object categories available in the gallery strip.
 * Defined here so the list has a single authoritative source.
 */
export const drawingCategories = [
  { id: 'face',   label: 'Face'   },
  { id: 'person', label: 'Person' },
  { id: 'animal', label: 'Animal' },
  { id: 'cat',    label: 'Cat'    },
  { id: 'dog',    label: 'Dog'    },
  { id: 'bird',   label: 'Bird'   },
  { id: 'tree',   label: 'Tree'   },
  { id: 'flower', label: 'Flower' },
  { id: 'car',    label: 'Car'    },
  { id: 'house',  label: 'House'  },
  { id: 'chair',  label: 'Chair'  },
  { id: 'cup',    label: 'Cup'    },
  { id: 'food',   label: 'Food'   },
  { id: 'guitar', label: 'Guitar' },
  { id: 'robot',  label: 'Robot'  },
] as const;


// ─── AI-Domain Tokens ─────────────────────────────────────────────────────────
// These tokens make the AI pipeline's visual and behavioural contract explicit.
// They are intentionally separate from the UI tokens above — the boundary
// marks where deterministic design ends and generative output begins.

export const ai = {
  /**
   * Number of swatches in an AI-generated emotion palette.
   * Gemini vision analysis populates this slot at runtime; the count is fixed.
   */
  emotionPaletteSize: 8,

  /** Named states for AI processing feedback UI. */
  responseState: {
    idle:       'idle',
    analyzing:  'analyzing',
    generating: 'generating',
    responding: 'responding',
  } as const,

  /** Inactivity period before the canvas and all state reset (ms). */
  inactivityTimeout: 30_000,

  /**
   * Exponential back-off ladder for Gemini 429 rate-limit retries.
   * Index 0 = first retry delay; max 3 retries before giving up.
   */
  backoffDelays: [1_000, 2_000, 4_000, 8_000] as const,

  /** Gemini model identifiers — update here when upgrading. */
  models: {
    chat:        'gemini-2.0-flash',
    imageGen:    'gemini-2.5-flash-image',
  },
} as const;


// ─── Motion Tokens ────────────────────────────────────────────────────────────

export const motion = {
  /** Duration values in milliseconds — use with Framer Motion `duration` (divide by 1000). */
  duration: {
    instant: 0,
    fast:    150,
    normal:  300,
    slow:    500,
    crawl:   800,
  },
  easing: {
    standard:   'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;


// ─── Type Exports ─────────────────────────────────────────────────────────────

export type DrawingColor      = keyof typeof color.drawing;
export type BrushSizeKey      = keyof typeof canvas.brushSize;
export type EraserSizeKey     = keyof typeof canvas.eraserSize;
export type DrawingCategoryId = typeof drawingCategories[number]['id'];
export type AIResponseState   = typeof ai.responseState[keyof typeof ai.responseState];
export type GeminiModel       = typeof ai.models[keyof typeof ai.models];
export type MotionDuration    = keyof typeof motion.duration;
export type MotionEasing      = keyof typeof motion.easing;
export type SemanticColor     = keyof typeof semantic.color;
