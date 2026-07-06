'use client';

import { useEffect } from 'react';
import {
  applyOverride,
  currentBreakpoint,
  discoverHandAuthored,
  discoverTextContainers,
  googleFontsUrl,
  pathFor,
} from '@/lib/visualEdit';
import type { Breakpoint, OverrideRecord, OverridesConfig } from '@/lib/types';

/**
 * In-place editing layer for the "Edit Visually" page in the admin.
 *
 * Only activates when ?visualEdit=1 AND inside an iframe (so it never runs
 * on the public site). Auto-discovers every text container on the page,
 * makes them editable, and renders a floating toolbar for color / font /
 * size / weight / align / drag against a per-breakpoint override. All
 * persistence goes through postMessage to the Filament parent (see
 * edit-visually.blade.php), which forwards to Livewire → the CMS.
 */
export default function VisualEditor() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('visualEdit')) return;
    if (window.self === window.top) return;

    /* ─────────────────────── message bridge ─────────────────────── */

    const post = (msg: Record<string, unknown>) =>
      window.parent.postMessage({ source: 'dawood-visual', ...msg }, '*');

    /* ─────────────────────── editor state ────────────────────────── */

    // In-memory copy of overrides so previews are instant while the parent
    // persists asynchronously. Seed from a bootstrap script injected by the
    // server (see OverrideRenderer wiring in layout.tsx).
    let overrides: OverridesConfig = readBootstrap();
    let breakpoint: Breakpoint = currentBreakpoint();

    let activePath: string | null = null;
    let activeEl: HTMLElement | null = null;
    let dragMode = false;
    let googleFontsLink: HTMLLinkElement | null = null;

    /* ─────────────────────── style + fonts ───────────────────────── */

    const style = document.createElement('style');
    style.textContent = `
      .ve-editable { outline: 1px dashed rgba(240,178,100,.45); outline-offset: 2px; transition: outline-color .12s; cursor: text; }
      .ve-editable:hover { outline-color: #f0b264; }
      .ve-editable.ve-active { outline: 2px solid #f0b264; background: rgba(240,178,100,.06); }
      [data-edit][contenteditable]:focus { outline: 2px solid #f0b264; background: rgba(240,178,100,.08); }
      .ve-editable.ve-drag { cursor: grab; }
      .ve-editable.ve-dragging { cursor: grabbing !important; }
      #ve-toolbar { position: fixed; z-index: 2147483647; background: rgba(20,18,15,.98); color: #e7e2d8;
        border: 1px solid rgba(240,178,100,.35); border-radius: 12px; padding: 10px 12px;
        font: 500 12px/1.2 -apple-system, system-ui, sans-serif; box-shadow: 0 12px 32px rgba(0,0,0,.5);
        display: none; user-select: none; min-width: 280px; max-width: 360px; }
      #ve-toolbar.ve-show { display: block; }
      #ve-toolbar .row { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
      #ve-toolbar .row:first-child { margin-top: 0; }
      #ve-toolbar label { color: #9ca3af; min-width: 46px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
      #ve-toolbar input[type="text"], #ve-toolbar input[type="number"], #ve-toolbar select {
        flex: 1; background: #0e0d0c; color: #e7e2d8; border: 1px solid rgba(255,255,255,.16);
        border-radius: 6px; padding: 5px 8px; font: inherit; min-width: 0; }
      #ve-toolbar input[type="color"] { width: 32px; height: 24px; border: 0; padding: 0; background: transparent; cursor: pointer; }
      #ve-toolbar button { background: #1c1a17; color: #e7e2d8; border: 1px solid rgba(255,255,255,.16);
        border-radius: 6px; padding: 5px 9px; cursor: pointer; font: inherit; }
      #ve-toolbar button:hover { background: #262320; }
      #ve-toolbar button.primary { background: #f0b264; color: #1c1a17; border-color: transparent; }
      #ve-toolbar button.on { background: #f0b264; color: #1c1a17; border-color: transparent; }
      #ve-toolbar .bp { display: flex; gap: 4px; }
      #ve-toolbar .bp button { padding: 4px 8px; font-size: 11px; }
      #ve-toolbar .hint { color: #6b7280; font-size: 11px; margin-top: 6px; }
      #ve-toolbar .caret { position: absolute; top: -6px; left: 24px; width: 10px; height: 10px;
        background: rgba(20,18,15,.98); border-left: 1px solid rgba(240,178,100,.35);
        border-top: 1px solid rgba(240,178,100,.35); transform: rotate(45deg); }
      #ve-status { position: fixed; top: 10px; right: 12px; z-index: 2147483646; background: rgba(20,18,15,.9);
        color: #f0b264; padding: 6px 10px; border-radius: 8px; font: 500 12px/1 -apple-system, system-ui;
        border: 1px solid rgba(240,178,100,.35); pointer-events: none; opacity: 0; transition: opacity .2s; }
      #ve-status.ve-show { opacity: 1; }
    `;
    document.head.appendChild(style);

    // Populate <datalist> for font autocomplete — a curated top-list keeps
    // the UI usable while still letting admins type any Google family name.
    const fontList = document.createElement('datalist');
    fontList.id = 've-fontlist';
    for (const f of POPULAR_FONTS) {
      const o = document.createElement('option');
      o.value = f;
      fontList.appendChild(o);
    }
    document.body.appendChild(fontList);

    /** Load a Google Font on demand so the preview reflects the chosen family. */
    const loadFont = (family: string) => {
      const families = collectFamilies();
      if (family && family.trim() !== '') families.add(family.trim());
      const url = googleFontsUrl(Array.from(families));
      if (!url) return;
      if (!googleFontsLink) {
        googleFontsLink = document.createElement('link');
        googleFontsLink.rel = 'stylesheet';
        googleFontsLink.setAttribute('data-visual-fonts', '1');
        document.head.appendChild(googleFontsLink);
      }
      googleFontsLink.href = url;
    };

    const collectFamilies = () => {
      const set = new Set<string>();
      for (const r of Object.values(overrides)) {
        const f = r.style?.fontFamily;
        if (typeof f === 'string' && f.trim() !== '') set.add(f.trim());
      }
      return set;
    };

    /* ─────────────────────── toolbar UI ──────────────────────────── */

    const toolbar = document.createElement('div');
    toolbar.id = 've-toolbar';
    toolbar.innerHTML = `
      <div class="caret"></div>
      <div class="row bp">
        <label>Device</label>
        <button data-bp="desktop">Desktop</button>
        <button data-bp="tablet">Tablet</button>
        <button data-bp="mobile">Mobile</button>
      </div>
      <div class="row">
        <label>Color</label>
        <input type="color" id="ve-color" />
        <input type="text" id="ve-color-text" placeholder="#f0b264" style="max-width:110px" />
        <button id="ve-color-clear" title="Remove color override">×</button>
      </div>
      <div class="row">
        <label>Font</label>
        <input type="text" id="ve-font" list="ve-fontlist" placeholder="Playfair Display" />
      </div>
      <div class="row">
        <label>Size</label>
        <input type="number" id="ve-size" min="8" max="400" step="1" placeholder="px" />
        <label style="min-width:auto">Weight</label>
        <select id="ve-weight">
          <option value="">—</option>
          <option>300</option><option>400</option><option>500</option>
          <option>600</option><option>700</option><option>800</option><option>900</option>
        </select>
      </div>
      <div class="row">
        <label>Align</label>
        <button data-align="left">L</button>
        <button data-align="center">C</button>
        <button data-align="right">R</button>
        <button data-align="">—</button>
        <label style="min-width:auto">Style</label>
        <button data-italic="italic">I</button>
        <button data-italic="">—</button>
      </div>
      <div class="row">
        <label>Move</label>
        <button id="ve-drag">Drag mode: off</button>
        <button id="ve-reset-pos">Reset pos</button>
        <button id="ve-reset-all">Reset all</button>
      </div>
      <div class="hint" id="ve-path">–</div>
    `;
    document.body.appendChild(toolbar);

    /* ─────────── discovery + wiring ─────────── */

    let cleanups: Array<() => void> = [];

    /** Register one element as editable and wire selection + inline text. */
    const registerElement = (el: HTMLElement, path: string, editable: boolean) => {
      el.classList.add('ve-editable');
      el.dataset.vePath = path;

      const onClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        selectElement(el, path);
      };
      el.addEventListener('click', onClick, true);

      let onBlur: (() => void) | null = null;
      if (editable) {
        el.setAttribute('contenteditable', 'plaintext-only');
        onBlur = () => {
          const value = el.textContent?.trim() ?? '';
          const rec = overrides[path] || {};
          if ((rec.text ?? el.dataset.veOriginal ?? '') !== value) {
            // Store as override for auto paths; hand-authored still saves via
            // the section payload (server routes both through saveText).
            post({ type: 'text', path, value });
            overrides[path] = { ...rec, text: value };
          }
        };
        el.addEventListener('blur', onBlur);
        // Cache the original text so a "reset" can restore it visually.
        if (!el.dataset.veOriginal) el.dataset.veOriginal = el.textContent?.trim() ?? '';
      }

      cleanups.push(() => {
        el.classList.remove('ve-editable', 've-active', 've-drag', 've-dragging');
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-ve-path');
        el.removeEventListener('click', onClick, true);
        if (onBlur) el.removeEventListener('blur', onBlur);
      });
    };

    const activate = () => {
      // Existing hand-authored data-edit paths (backwards compatible).
      for (const el of discoverHandAuthored()) {
        const path = el.getAttribute('data-edit') || '';
        const kind = el.getAttribute('data-edit-kind') || 'text';
        if (!path) continue;

        if (kind === 'text') {
          registerElement(el as HTMLElement, path, true);
        } else if (kind === 'image') {
          (el as HTMLElement).style.cursor = 'pointer';
          const onClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            post({ type: 'image', path, value: el.getAttribute('data-edit-src') || '' });
          };
          el.addEventListener('click', onClick, true);
          cleanups.push(() => el.removeEventListener('click', onClick, true));
        } else {
          (el as HTMLElement).style.cursor = 'pointer';
          const onClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            post({ type: 'open', path });
          };
          el.addEventListener('click', onClick, true);
          cleanups.push(() => el.removeEventListener('click', onClick, true));
        }
      }

      // Every other text container becomes an __auto path.
      for (const el of discoverTextContainers()) {
        // Skip if hand-authored data-edit already claimed this node.
        if (el.hasAttribute('data-edit')) continue;
        registerElement(el as HTMLElement, pathFor(el), true);
      }

      post({ type: 'ready', count: document.querySelectorAll('.ve-editable').length });
    };

    /* ─────────── selection + toolbar sync ─────────── */

    const selectElement = (el: HTMLElement, path: string) => {
      // De-select prior
      if (activeEl) activeEl.classList.remove('ve-active');
      activeEl = el;
      activePath = path;
      el.classList.add('ve-active');

      // Position toolbar near the element (below if room, above otherwise).
      const rect = el.getBoundingClientRect();
      const tbRect = toolbar.getBoundingClientRect();
      const top = rect.bottom + 12 + tbRect.height < window.innerHeight
        ? rect.bottom + 12
        : Math.max(12, rect.top - tbRect.height - 12);
      toolbar.style.top = `${top}px`;
      const left = Math.min(
        window.innerWidth - Math.max(300, tbRect.width) - 12,
        Math.max(12, rect.left)
      );
      toolbar.style.left = `${left}px`;
      toolbar.classList.add('ve-show');

      syncToolbar();
    };

    const deselect = () => {
      if (activeEl) activeEl.classList.remove('ve-active');
      activeEl = null;
      activePath = null;
      toolbar.classList.remove('ve-show');
    };

    const currentRecord = (): OverrideRecord => (activePath ? overrides[activePath] || {} : {});

    /** Push current record's values into the toolbar controls. */
    const syncToolbar = () => {
      if (!activePath || !activeEl) return;
      const rec = currentRecord();
      const s = rec.style || {};

      // Breakpoint tabs
      toolbar.querySelectorAll<HTMLButtonElement>('.bp button').forEach((b) => {
        b.classList.toggle('on', b.dataset.bp === breakpoint);
      });

      const cs = getComputedStyle(activeEl);
      (toolbar.querySelector('#ve-color') as HTMLInputElement).value =
        hexOf(s.color || cs.color) || '#ffffff';
      (toolbar.querySelector('#ve-color-text') as HTMLInputElement).value = s.color || '';
      (toolbar.querySelector('#ve-font') as HTMLInputElement).value = s.fontFamily || '';
      const size = s.fontSize?.[breakpoint] ?? s.fontSize?.desktop ?? null;
      (toolbar.querySelector('#ve-size') as HTMLInputElement).value =
        size != null ? String(size) : '';
      (toolbar.querySelector('#ve-weight') as HTMLSelectElement).value =
        s.fontWeight != null ? String(s.fontWeight) : '';
      toolbar.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) => {
        b.classList.toggle('on', (s.textAlign || '') === b.dataset.align);
      });
      toolbar.querySelectorAll<HTMLButtonElement>('[data-italic]').forEach((b) => {
        b.classList.toggle('on', (s.fontStyle || '') === b.dataset.italic);
      });
      (toolbar.querySelector('#ve-drag') as HTMLButtonElement).textContent =
        `Drag mode: ${dragMode ? 'on' : 'off'}`;
      (toolbar.querySelector('#ve-drag') as HTMLButtonElement).classList.toggle('on', dragMode);
      (toolbar.querySelector('#ve-path') as HTMLElement).textContent = activePath;
    };

    /* ─────────── mutations ─────────── */

    const showStatus = (msg: string) => {
      let s = document.getElementById('ve-status') as HTMLDivElement | null;
      if (!s) {
        s = document.createElement('div');
        s.id = 've-status';
        document.body.appendChild(s);
      }
      s.textContent = msg;
      s.classList.add('ve-show');
      window.clearTimeout((s as unknown as { _t?: number })._t);
      (s as unknown as { _t?: number })._t = window.setTimeout(
        () => s!.classList.remove('ve-show'),
        1400,
      ) as unknown as number;
    };

    /** Apply a patch to the current element's record + preview + send up. */
    const patch = (patchObj: Partial<OverrideRecord> & {
      style?: Partial<OverrideRecord['style'] & object>;
      position?: Partial<NonNullable<OverrideRecord['position']>>;
    }) => {
      if (!activePath || !activeEl) return;
      const before = overrides[activePath] || {};
      const merged = deepMerge(before, patchObj);
      overrides[activePath] = pruneNulls(merged);
      applyOverride(activeEl, overrides[activePath], breakpoint);
      post({ type: 'override', path: activePath, patch: patchObj });
      showStatus('Saving…');
      syncToolbar();
    };

    /* ─────────── control wiring ─────────── */

    // Breakpoint tabs — purely a UI-side selector; site itself detects viewport.
    toolbar.querySelectorAll<HTMLButtonElement>('.bp button').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        breakpoint = b.dataset.bp as Breakpoint;
        syncToolbar();
      });
    });

    // Color
    const colorInput = toolbar.querySelector('#ve-color') as HTMLInputElement;
    const colorText = toolbar.querySelector('#ve-color-text') as HTMLInputElement;
    colorInput.addEventListener('input', () => {
      colorText.value = colorInput.value;
      patch({ style: { color: colorInput.value } });
    });
    colorText.addEventListener('change', () => {
      const v = colorText.value.trim();
      patch({ style: { color: v || null } });
    });
    (toolbar.querySelector('#ve-color-clear') as HTMLButtonElement).addEventListener('click', () => {
      patch({ style: { color: null } });
    });

    // Font family
    const fontInput = toolbar.querySelector('#ve-font') as HTMLInputElement;
    fontInput.addEventListener('change', () => {
      const v = fontInput.value.trim();
      if (v) loadFont(v);
      patch({ style: { fontFamily: v || null } });
    });

    // Font size — stored per breakpoint
    const sizeInput = toolbar.querySelector('#ve-size') as HTMLInputElement;
    sizeInput.addEventListener('change', () => {
      const n = sizeInput.value.trim() === '' ? null : Number(sizeInput.value);
      patch({ style: { fontSize: { [breakpoint]: n } as Record<Breakpoint, number | null> } });
    });

    // Weight
    const weightSel = toolbar.querySelector('#ve-weight') as HTMLSelectElement;
    weightSel.addEventListener('change', () => {
      const v = weightSel.value ? Number(weightSel.value) : null;
      patch({ style: { fontWeight: v } });
    });

    // Alignment
    toolbar.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = b.dataset.align || null;
        patch({ style: { textAlign: v as 'left' | 'center' | 'right' | null } });
      });
    });

    // Italic
    toolbar.querySelectorAll<HTMLButtonElement>('[data-italic]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = b.dataset.italic || null;
        patch({ style: { fontStyle: v as 'italic' | null } });
      });
    });

    // Drag mode toggle
    const dragBtn = toolbar.querySelector('#ve-drag') as HTMLButtonElement;
    dragBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dragMode = !dragMode;
      document.querySelectorAll('.ve-editable').forEach((el) => {
        el.classList.toggle('ve-drag', dragMode);
        (el as HTMLElement).setAttribute('contenteditable', dragMode ? 'false' : 'plaintext-only');
      });
      syncToolbar();
    });

    // Reset current position
    (toolbar.querySelector('#ve-reset-pos') as HTMLButtonElement).addEventListener('click', () => {
      patch({ position: { [breakpoint]: null } as Record<Breakpoint, { x: number; y: number } | null> });
    });

    // Reset entire element
    (toolbar.querySelector('#ve-reset-all') as HTMLButtonElement).addEventListener('click', () => {
      if (!activePath || !activeEl) return;
      delete overrides[activePath];
      // Clear inline styles
      activeEl.style.cssText = '';
      if (activeEl.dataset.veOriginal != null) activeEl.textContent = activeEl.dataset.veOriginal;
      post({ type: 'override', path: activePath, patch: {} });
      showStatus('Reset');
      syncToolbar();
    });

    /* ─────────── drag ─────────── */

    let dragStart: { x: number; y: number; ox: number; oy: number; el: HTMLElement } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (!dragMode) return;
      const target = (e.target as HTMLElement)?.closest?.('.ve-editable') as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const path = target.dataset.vePath || '';
      selectElement(target, path);
      const rec = overrides[path] || {};
      const p = (rec.position?.[breakpoint] ?? rec.position?.desktop ?? { x: 0, y: 0 });
      dragStart = { x: e.clientX, y: e.clientY, ox: p.x || 0, oy: p.y || 0, el: target };
      target.classList.add('ve-dragging');
      target.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const x = Math.round(dragStart.ox + dx);
      const y = Math.round(dragStart.oy + dy);
      dragStart.el.style.transform = `translate(${x}px, ${y}px)`;
      dragStart.el.style.willChange = 'transform';
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const x = Math.round(dragStart.ox + dx);
      const y = Math.round(dragStart.oy + dy);
      dragStart.el.classList.remove('ve-dragging');
      const path = dragStart.el.dataset.vePath || '';
      dragStart = null;
      patch({ position: { [breakpoint]: { x, y } } as Record<Breakpoint, { x: number; y: number }> });
      // Force selection to persist post-drag
      selectElement(document.querySelector(`[data-ve-path="${cssEscape(path)}"]`) as HTMLElement, path);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);

    /* ─────────── outside click deselects ─────────── */

    const onDocClick = (e: Event) => {
      const t = e.target as HTMLElement;
      if (toolbar.contains(t)) return;
      if (t.closest('.ve-editable')) return;
      deselect();
    };
    document.addEventListener('click', onDocClick, true);

    /* ─────────── incoming messages from parent ─────────── */

    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== 'dawood-visual-parent') return;
      if (d.type === 'saved') {
        showStatus('Saved ✓');
      }
    };
    window.addEventListener('message', onMessage);

    /* ─────────── bring initial overrides in ─────────── */

    // Kick off font loading for any families already saved.
    const initialFamilies = collectFamilies();
    if (initialFamilies.size > 0) loadFont('');

    // Apply initial overrides visually before the editor lights up.
    const initialApply = () => {
      for (const [path, rec] of Object.entries(overrides)) {
        const el = document.querySelector<HTMLElement>(`[data-ve-path="${cssEscape(path)}"]`);
        if (el) applyOverride(el, rec, breakpoint);
      }
    };

    // Delay until hydration so client React doesn't stomp our reads.
    const t = window.setTimeout(() => {
      activate();
      initialApply();
    }, 500);

    /* ─────────── teardown ─────────── */

    return () => {
      window.clearTimeout(t);
      cleanups.forEach((fn) => fn());
      cleanups = [];
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('message', onMessage);
      toolbar.remove();
      style.remove();
      fontList.remove();
      googleFontsLink?.remove();
      document.getElementById('ve-status')?.remove();
    };
  }, []);

  return null;
}

/* ─────────── helpers ─────────── */

function readBootstrap(): OverridesConfig {
  try {
    const el = document.getElementById('__overrides');
    if (!el) return {};
    return JSON.parse(el.textContent || '{}') as OverridesConfig;
  } catch {
    return {};
  }
}

function hexOf(color: string): string {
  // Accept #hex directly; otherwise let the browser normalise via a temp elem.
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const tmp = document.createElement('span');
  tmp.style.color = color;
  document.body.appendChild(tmp);
  const rgb = getComputedStyle(tmp).color;
  tmp.remove();
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#ffffff';
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

// CSS.escape polyfill for older iframes (Filament may load in mixed contexts).
function cssEscape(v: string): string {
  const CSSw = (window as unknown as { CSS?: { escape?: (s: string) => string } }).CSS;
  if (CSSw?.escape) return CSSw.escape(v);
  return v.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

function deepMerge<T>(a: T, b: DeepPartial<T>): T {
  if (typeof a !== 'object' || a === null) return (b as unknown as T);
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const k of Object.keys(b as object)) {
    const av = (a as Record<string, unknown>)[k];
    const bv = (b as Record<string, unknown>)[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && av && typeof av === 'object' && !Array.isArray(av)) {
      out[k] = deepMerge(av, bv as DeepPartial<typeof av>);
    } else {
      out[k] = bv;
    }
  }
  return out as T;
}

function pruneNulls<T>(node: T): T {
  if (node === null || typeof node !== 'object') return node;
  const rec = node as Record<string, unknown>;
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (v === null || v === undefined) {
      delete rec[k];
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      pruneNulls(v as Record<string, unknown>);
      if (Object.keys(v as Record<string, unknown>).length === 0) delete rec[k];
    }
  }
  return node;
}

/** Popular Google Fonts for the datalist autocomplete. Not exhaustive. */
const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato', 'Nunito',
  'Playfair Display', 'Fraunces', 'DM Serif Display', 'Cormorant Garamond',
  'Cormorant', 'EB Garamond', 'Lora', 'Merriweather', 'Bitter', 'Bebas Neue',
  'Oswald', 'Anton', 'Archivo Black', 'Space Grotesk', 'Space Mono', 'JetBrains Mono',
  'Manrope', 'Rubik', 'Work Sans', 'Barlow', 'Karla', 'Josefin Sans', 'Raleway',
  'Quicksand', 'Prompt', 'Kanit', 'Sora', 'DM Sans', 'IBM Plex Sans', 'IBM Plex Serif',
  'Libre Baskerville', 'Libre Franklin', 'Crimson Pro', 'PT Serif', 'PT Sans',
  'Source Sans 3', 'Source Serif 4', 'Noto Sans', 'Noto Serif',
  'Abril Fatface', 'Bodoni Moda', 'Italiana', 'Marcellus', 'Cinzel',
  'Dancing Script', 'Great Vibes', 'Pacifico', 'Caveat', 'Satisfy',
];
