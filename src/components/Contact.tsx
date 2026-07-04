'use client';

import { useState } from 'react';
import type { SiteConfig } from '@/lib/types';
import ExifTag from './ExifTag';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact({ site }: { site: SiteConfig }) {
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('bad status');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const field =
    'w-full border border-line bg-raise px-4 py-3 text-ink placeholder:text-muted focus:border-amber focus:outline-none transition-colors duration-300';

  return (
    <section id="contact" className="border-t border-line px-[var(--gutter)] py-[var(--space-section)]">
      <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div>
          <ExifTag>Bookings</ExifTag>
          <h2 className="display display-section mt-4">
            Let&rsquo;s plan
            <br />
            the shot
          </h2>
          <p className="mt-5 max-w-md text-muted">
            Tell me what you are making and when you need it. I reply within one working day,
            usually faster on WhatsApp.
          </p>
          <a
            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hi Dawood, I would like to book a shoot.')}`}
            target="_blank"
            rel="noreferrer"
            className="exif mt-8 inline-block border border-amber px-5 py-3 transition-colors duration-300 ease-out-expo hover:bg-amber hover:text-bg"
            style={{ color: 'var(--amber)' }}
          >
            WhatsApp me directly ↗
          </a>
          <p className="exif mt-4">
            Or write to <b>{site.email}</b>
          </p>
        </div>

        {status === 'sent' ? (
          <div className="grid place-items-center border border-amber p-10 text-center">
            <div>
              <p className="display text-4xl">Received.</p>
              <p className="mt-3 text-muted">
                Your brief is in. I will come back to you within one working day.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="exif mb-2 block">Name</span>
                <input name="name" required autoComplete="name" className={field} placeholder="Your name" />
              </label>
              <label className="block">
                <span className="exif mb-2 block">Email</span>
                <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@company.com" />
              </label>
            </div>
            <label className="block">
              <span className="exif mb-2 block">Shoot type</span>
              <select name="type" className={field} defaultValue="Product">
                <option>Product</option>
                <option>Models</option>
                <option>Events</option>
                <option>Something else</option>
              </select>
            </label>
            <label className="block">
              <span className="exif mb-2 block">The brief</span>
              <textarea
                name="message"
                required
                rows={5}
                className={field}
                placeholder="What are we shooting, where, and by when?"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="exif border border-amber px-6 py-3 transition-colors duration-300 ease-out-expo hover:bg-amber hover:text-bg disabled:opacity-50"
              style={{ color: 'var(--amber)' }}
            >
              {status === 'sending' ? 'Sending…' : 'Send the brief'}
            </button>
            {status === 'error' && (
              <p className="exif" style={{ color: 'var(--hassel-red)' }}>
                The form did not go through. Email or WhatsApp me instead and I will pick it up.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
