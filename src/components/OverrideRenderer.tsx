'use client';

import { useEffect } from 'react';
import {
  applyOverride,
  currentBreakpoint,
  discoverHandAuthored,
  discoverTextContainers,
  googleFontsUrl,
  pathFor,
  uniqueFontFamilies,
} from '@/lib/visualEdit';
import type { OverridesConfig } from '@/lib/types';

/**
 * Applies visual-editor overrides on the live site.
 *
 * Rendered from `layout.tsx` with the overrides map fetched at request time.
 * Walks the same paths as the editor, applies text/style/position, and
 * lazy-loads any Google Fonts the overrides reference. Re-applies on resize
 * so the breakpoint bucket switches responsively.
 */
export default function OverrideRenderer({ overrides }: { overrides: OverridesConfig }) {
  useEffect(() => {
    if (!overrides || Object.keys(overrides).length === 0) return;

    // Load referenced Google Fonts once. If admins pick weird names the link
    // just 404s silently — the CSS falls back to the local stack.
    const families = uniqueFontFamilies(overrides);
    const url = googleFontsUrl(families);
    let link: HTMLLinkElement | null = null;
    if (url) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.setAttribute('data-visual-fonts', '1');
      document.head.appendChild(link);
    }

    const apply = () => {
      const bp = currentBreakpoint();

      // Hand-authored data-edit paths first (verbatim string match).
      for (const el of discoverHandAuthored()) {
        const path = el.getAttribute('data-edit');
        if (!path) continue;
        const record = overrides[path];
        if (record) applyOverride(el as HTMLElement, record, bp);
      }

      // Then auto-discovered text containers by computed path.
      for (const el of discoverTextContainers()) {
        const path = pathFor(el);
        const record = overrides[path];
        if (record) applyOverride(el as HTMLElement, record, bp);
      }
    };

    // Give hydration time so element indices match server render.
    const raf = requestAnimationFrame(() => requestAnimationFrame(apply));

    const onResize = () => apply();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      link?.remove();
    };
  }, [overrides]);

  return null;
}
