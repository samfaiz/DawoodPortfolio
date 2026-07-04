'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { WorkConfig, WorkItem } from '@/lib/types';
import ExifTag from './ExifTag';

gsap.registerPlugin(ScrollTrigger);

/**
 * The full gallery the scrub section hands off into. Category filter,
 * CSS-columns masonry, lightbox with keyboard support. Content comes from
 * work.json today and the Laravel media library in Phase 4.
 */
export default function Gallery({ work }: { work: WorkConfig }) {
  const [filter, setFilter] = useState<string>('All');
  const [open, setOpen] = useState<WorkItem | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => (filter === 'All' ? work.items : work.items.filter((i) => i.category === filter)),
    [filter, work.items]
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const figures = Array.from(grid.querySelectorAll('figure'));
    const tween = gsap.from(figures, {
      y: 42,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: grid, start: 'top 82%' },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = items.findIndex((i) => i.id === open.id);
        const next = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
        setOpen(items[(next + items.length) % items.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items]);

  return (
    <section id="gallery" className="px-[var(--gutter)] py-[var(--space-section)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <ExifTag>Full gallery</ExifTag>
          <h2 className="display display-section mt-4">The work</h2>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Filter gallery by category">
          {['All', ...work.categories].map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={filter === c}
              onClick={() => setFilter(c)}
              className="exif border px-4 py-2 transition-colors duration-300 ease-out-expo"
              style={{
                borderColor: filter === c ? 'var(--amber)' : 'var(--line)',
                color: filter === c ? 'var(--amber)' : 'var(--muted)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {items.map((item) => (
          <figure key={item.id} className="mb-4 break-inside-avoid">
            <button
              onClick={() => setOpen(item)}
              className="group relative block w-full overflow-hidden border border-line bg-raise"
              aria-label={`Open ${item.title}`}
            >
              <div className="relative w-full" style={{ aspectRatio: item.ratio }}>
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-3 px-3 py-2.5 text-left">
                <span className="text-sm text-ink">{item.title}</span>
                <span className="exif shrink-0">{item.exif}</span>
              </figcaption>
            </button>
          </figure>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-bg/95 p-[var(--gutter)]"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setOpen(null)}
        >
          <figure className="max-h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full" style={{ aspectRatio: open.ratio, maxHeight: '78svh' }}>
              <Image src={open.src} alt={open.title} fill sizes="90vw" className="object-contain" />
            </div>
            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="display text-2xl">{open.title}</p>
                <p className="exif mt-1">
                  {open.category} <b>·</b> {open.exif}
                </p>
              </div>
              <button
                onClick={() => setOpen(null)}
                className="exif border border-line px-4 py-2 hover:border-amber"
                style={{ color: 'var(--ink)' }}
              >
                Close (Esc)
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
