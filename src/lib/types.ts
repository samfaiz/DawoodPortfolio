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
