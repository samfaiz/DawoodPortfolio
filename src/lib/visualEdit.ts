/**
 * Shared logic for the visual editor: how we auto-discover editable text
 * nodes, how we mint a stable path for each, and how the current viewport
 * maps to one of three breakpoints. OverrideRenderer (public site) and
 * VisualEditor (admin iframe) both call these so they agree exactly.
 */
import type { Breakpoint, OverrideRecord, ResponsiveNumber, ResponsivePoint } from './types';

/** Elements never considered for text discovery. */
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS', 'SVG', 'PATH', 'IFRAME',
  'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON',
  'IMG', 'VIDEO', 'AUDIO', 'PICTURE', 'SOURCE', 'TRACK',
]);

/** Inline elements that shouldn't split a text container. */
const INLINE_TAGS = new Set([
  'A', 'SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'SMALL', 'BR', 'MARK',
  'SUB', 'SUP', 'CODE', 'KBD', 'ABBR', 'CITE', 'Q', 'DEL', 'INS',
]);

/** Section keys we recognise on the page (matches `data-section` markers). */
export const KNOWN_SECTIONS = [
  'hero', 'work', 'gallery', 'about', 'services',
  'testimonials', 'instagram', 'contact', 'footer',
] as const;

export type SectionKey = (typeof KNOWN_SECTIONS)[number] | 'page';

/**
 * An element counts as an editable text container if it has visible text and
 * every child is either a Text node or a purely inline element. Prevents us
 * from making a whole grid editable when we mean the paragraph inside it.
 */
export function isTextContainer(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false;
  if (!el.textContent || el.textContent.trim() === '') return false;

  // Skip if wrapped by hand-authored data-edit (that one wins for text).
  if (el.hasAttribute('data-edit') && el.getAttribute('data-edit-kind') !== 'open') return false;

  let hasText = false;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if ((child.textContent || '').trim() !== '') hasText = true;
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName;
      if (!INLINE_TAGS.has(tag)) return false;
    }
  }
  return hasText;
}

/** Walk up to the nearest `[data-section]` ancestor; default to 'page'. */
export function sectionOf(el: Element): SectionKey {
  let node: Element | null = el;
  while (node && node !== document.body) {
    const s = node.getAttribute?.('data-section');
    if (s) return s as SectionKey;
    node = node.parentElement;
  }
  return 'page';
}

/**
 * Build a stable path for an element within its section: an ancestor-index
 * chain from the section root down to this element, e.g. "hero:__auto.0.1.2".
 * Resilient to sibling reordering only in aggregate, not perfectly — that is
 * the accepted tradeoff for auto-discovery.
 */
export function pathFor(el: Element): string {
  const section = sectionOf(el);
  const root = section === 'page'
    ? document.body
    : document.querySelector(`[data-section="${section}"]`);
  if (!root) return `${section}:__auto.orphan`;

  const chain: number[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    const idx = Array.prototype.indexOf.call(parent.children, node);
    chain.unshift(idx);
    node = parent;
  }
  return `${section}:__auto.${chain.join('.')}`;
}

/** All text-container elements on the page, in DOM order. */
export function discoverTextContainers(root: ParentNode = document): Element[] {
  const out: Element[] = [];
  const all = root.querySelectorAll<HTMLElement>('body [data-section] *, body [data-section]');
  for (const el of Array.from(all)) {
    if (isTextContainer(el)) out.push(el);
  }
  return out;
}

/** Elements that already have a hand-authored data-edit — path is verbatim. */
export function discoverHandAuthored(root: ParentNode = document): Element[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-edit]'));
}

/** Current viewport → breakpoint bucket used for style + position overrides. */
export function currentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w >= 1024) return 'desktop';
  if (w >= 640) return 'tablet';
  return 'mobile';
}

/** Pick the value for the current breakpoint, falling back to desktop. */
export function pickResponsive<T>(
  v: ResponsiveNumber | ResponsivePoint | null | undefined,
  bp: Breakpoint,
): T | null {
  if (!v) return null;
  return ((v as Record<Breakpoint, T | null | undefined>)[bp]
    ?? (v as Record<Breakpoint, T | null | undefined>).desktop
    ?? null) as T | null;
}

/** Apply one override record to an element (text + inline styles + position). */
export function applyOverride(el: HTMLElement, record: OverrideRecord, bp: Breakpoint): void {
  // Text — only replace when the record explicitly sets one.
  if (typeof record.text === 'string' && record.text !== el.textContent) {
    el.textContent = record.text;
  }

  const style = record.style || {};
  el.style.color = style.color || '';
  el.style.fontFamily = style.fontFamily ? `"${style.fontFamily}", ${fallbackStack(el)}` : '';
  el.style.fontWeight = style.fontWeight != null ? String(style.fontWeight) : '';
  el.style.fontStyle = style.fontStyle || '';
  el.style.textAlign = style.textAlign || '';
  el.style.letterSpacing = style.letterSpacing != null ? `${style.letterSpacing}px` : '';
  el.style.lineHeight = style.lineHeight != null ? String(style.lineHeight) : '';

  const size = pickResponsive<number>(style.fontSize, bp);
  el.style.fontSize = size != null ? `${size}px` : '';

  const pos = pickResponsive<{ x: number; y: number }>(record.position, bp);
  if (pos && (pos.x !== 0 || pos.y !== 0)) {
    // Transform-based offset keeps the element in flow so neighbours don't
    // reflow underneath it. Feels like free positioning inside the section.
    el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    el.style.willChange = 'transform';
  } else {
    el.style.transform = '';
    el.style.willChange = '';
  }

  el.style.display = record.hidden ? 'none' : '';
}

/** Pick a reasonable fallback stack based on tag so the site stays legible. */
function fallbackStack(el: HTMLElement): string {
  const t = el.tagName;
  if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5' || t === 'H6') {
    return "'Fraunces', 'Playfair Display', Georgia, serif";
  }
  return "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
}

/**
 * Collect every unique Google Font family referenced in an overrides map so
 * the OverrideRenderer can load them all with a single stylesheet link.
 */
export function uniqueFontFamilies(overrides: Record<string, OverrideRecord>): string[] {
  const set = new Set<string>();
  for (const record of Object.values(overrides)) {
    const f = record.style?.fontFamily;
    if (typeof f === 'string' && f.trim() !== '') set.add(f.trim());
  }
  return Array.from(set);
}

/** Build a Google Fonts CSS2 link URL for a set of families. */
export function googleFontsUrl(families: string[]): string | null {
  if (families.length === 0) return null;
  const weights = 'wght@300;400;500;600;700;800;900';
  const parts = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:${weights}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${parts}&display=swap`;
}
