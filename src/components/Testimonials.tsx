'use client';

import { useState } from 'react';
import type { Testimonial } from '@/lib/types';
import ExifTag from './ExifTag';

export default function Testimonials({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const t = items[index];

  return (
    <section className="border-t border-line px-[var(--gutter)] py-[var(--space-section)]">
      <ExifTag>Word of mouth</ExifTag>
      <blockquote key={index} className="mt-6 max-w-4xl">
        <p className="display text-[clamp(1.7rem,3.6vw,3.2rem)] normal-case leading-tight">
          &ldquo;<span data-edit={`testimonials:items.${index}.quote`}>{t.quote}</span>&rdquo;
        </p>
        <footer className="exif mt-6">
          <span data-edit={`testimonials:items.${index}.name`}>{t.name}</span> <b>·</b>{' '}
          <span data-edit={`testimonials:items.${index}.org`}>{t.org}</span>
        </footer>
      </blockquote>

      <div className="mt-8 flex items-center gap-2" role="group" aria-label="Browse testimonials">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Testimonial ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className="h-2.5 w-2.5 rounded-full border transition-colors duration-300"
            style={{
              borderColor: i === index ? 'var(--amber)' : 'var(--line)',
              background: i === index ? 'var(--amber)' : 'transparent',
            }}
          />
        ))}
      </div>
    </section>
  );
}
