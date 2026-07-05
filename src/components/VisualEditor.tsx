'use client';

import { useEffect } from 'react';

/**
 * In-place editing layer for the "Edit Visually" page in the admin.
 *
 * It only activates when the site is loaded with ?visualEdit=1 AND inside an
 * iframe (i.e. the admin's Edit Visually page). It never runs on the public
 * site. Editing/authentication happens in the admin, which owns this frame —
 * this layer just reports edits up to it over postMessage; the admin persists
 * them. Elements opt in with:
 *
 *   data-edit="section:dot.path"                     -> inline-editable text
 *   data-edit="section:dot.path" data-edit-kind="open" -> click opens that
 *                                                          section's editor
 *
 * e.g. data-edit="about:paragraphs.0", data-edit="services:items.1.title".
 */
export default function VisualEditor() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('visualEdit')) return;
    if (window.self === window.top) return; // only inside the admin frame

    const post = (msg: Record<string, unknown>) =>
      window.parent.postMessage({ source: 'dawood-visual', ...msg }, '*');

    const nodes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-edit]'));

    const cleanups: Array<() => void> = [];

    const activate = () => {
      nodes().forEach((el) => {
        const path = el.getAttribute('data-edit') || '';
        const kind = el.getAttribute('data-edit-kind') || 'text';

        if (kind === 'text') {
          el.setAttribute('contenteditable', 'plaintext-only');
          el.dataset.veActive = '1';
          const onFocus = () => post({ type: 'focus', path });
          const onBlur = () => post({ type: 'text', path, value: el.textContent?.trim() ?? '' });
          // Don't follow links / trigger buttons while editing.
          const onClick = (e: Event) => e.preventDefault();
          el.addEventListener('focus', onFocus);
          el.addEventListener('blur', onBlur);
          el.addEventListener('click', onClick);
          cleanups.push(() => {
            el.removeAttribute('contenteditable');
            el.removeEventListener('focus', onFocus);
            el.removeEventListener('blur', onBlur);
            el.removeEventListener('click', onClick);
          });
        } else if (kind === 'image') {
          // Clicking an image asks the admin to pick/paste a replacement.
          el.style.cursor = 'pointer';
          const onClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            post({ type: 'image', path, value: el.getAttribute('data-edit-src') || '' });
          };
          el.addEventListener('click', onClick, true);
          cleanups.push(() => el.removeEventListener('click', onClick, true));
        } else {
          // "open" — clicking sends the admin to that section's editor.
          el.style.cursor = 'pointer';
          const onClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            post({ type: 'open', path });
          };
          el.addEventListener('click', onClick, true);
          cleanups.push(() => el.removeEventListener('click', onClick, true));
        }

        // Shared hover affordance.
        el.classList.add('ve-editable');
      });

      post({ type: 'ready', count: nodes().length });
    };

    // Inject the edit-affordance styles once.
    const style = document.createElement('style');
    style.textContent = `
      .ve-editable { outline: 1px dashed rgba(240,178,100,.5); outline-offset: 2px; transition: outline-color .15s; }
      .ve-editable:hover { outline: 2px solid #f0b264; }
      [data-edit][contenteditable]:focus { outline: 2px solid #f0b264; background: rgba(240,178,100,.08); }
    `;
    document.head.appendChild(style);

    // Give hydration a beat before wiring up.
    const t = window.setTimeout(activate, 400);

    return () => {
      window.clearTimeout(t);
      cleanups.forEach((fn) => fn());
      style.remove();
    };
  }, []);

  return null;
}
