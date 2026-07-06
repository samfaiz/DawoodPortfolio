export interface SiteConfig {
  name: string;
  role: string;
  city: string;
  tagline: string;
  email: string;
  whatsapp: string;
  instagram: { handle: string; url: string; mode: 'manual' | 'behold' | 'graph' };
  seo: { title: string; description: string };
}

export interface HeroCaption {
  t: number;
  text: string;
}

export interface HeroOverlay {
  t: number;
  type: 'work' | 'instagram' | 'scrollCue';
  category?: string;
  exif?: string;
  image?: string;
}

export interface HeroConfig {
  videoSrc: string;
  posterSrc: string;
  introOffset: number;
  captions: HeroCaption[];
  overlays: HeroOverlay[];
}

export interface TimePoint {
  p: number;
  t: number;
}

export interface Phase {
  from: number;
  to: number;
}

export interface BeatsConfig {
  videoSrc: string;
  framesFolder: string;
  framePrefix: string;
  frameExt: string;
  frameCount: number;
  duration: number;
  timeMap: TimePoint[];
  cardPhases: { enter: Phase; left: Phase; right: Phase; center: Phase; down: Phase };
}

export interface WorkItem {
  id: string;
  category: string;
  title: string;
  exif: string;
  src: string;
  ratio: string;
}

export interface WorkConfig {
  categories: string[];
  items: WorkItem[];
  floatingCards: string[];
}

export interface ServiceItem {
  id: string;
  title: string;
  blurb: string;
  deliverables: string;
  from: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  org: string;
}

export interface AboutConfig {
  portrait: string;
  portraitAlt: string;
  paragraphs: string[];
  stats: { value: string; label: string }[];
  gear: string[];
}

/**
 * Visual editor overrides, keyed by element path (e.g. "hero:__auto.h1[0]"
 * for auto-discovered nodes, or "about:paragraphs.0" for hand-authored ones).
 * Fields are all optional so the editor can save a single property at a time.
 * Numbers may be null when "unset" is meaningful.
 */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveNumber {
  desktop?: number | null;
  tablet?: number | null;
  mobile?: number | null;
}

export interface ResponsivePoint {
  desktop?: { x: number; y: number } | null;
  tablet?: { x: number; y: number } | null;
  mobile?: { x: number; y: number } | null;
}

export interface OverrideStyle {
  color?: string | null;
  fontFamily?: string | null;
  fontWeight?: number | null;
  fontStyle?: 'normal' | 'italic' | null;
  textAlign?: 'left' | 'center' | 'right' | null;
  letterSpacing?: number | null;
  lineHeight?: number | null;
  fontSize?: ResponsiveNumber | null;
}

export interface OverrideRecord {
  text?: string | null;
  style?: OverrideStyle | null;
  position?: ResponsivePoint | null;
  hidden?: boolean | null;
}

export type OverridesConfig = Record<string, OverrideRecord>;
