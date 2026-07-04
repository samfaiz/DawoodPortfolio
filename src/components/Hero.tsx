'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import type { HeroConfig, SiteConfig } from '@/lib/types';

/**
 * Hero film.
 *
 * Browsers force autoplay to be muted, so the voiceover is mirrored as
 * kinetic captions timed to the audio (hero.json), and a sound control
 * restarts the film with audio on demand. The right rail materializes
 * work cards, the Instagram panel and the scroll cue at the exact beats
 * Dawood speaks them. If /videos/hero.mp4 is not in place yet, the section
 * runs the same choreography on an internal clock so it stays previewable.
 */
export default function Hero({ hero, site }: { hero: HeroConfig; site: SiteConfig }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [ended, setEnded] = useState(false);
  const [missing, setMissing] = useState(false);

  // One clock for captions and overlays: the video when present,
  // a rAF-driven simulation when it is not.
  useEffect(() => {
    let raf = 0;
    let simStart = 0;
    const simLength = hero.introOffset + 15;

    const loop = (now: number) => {
      const v = videoRef.current;
      if (missing) {
        if (!simStart) simStart = now;
        const t = Math.min((now - simStart) / 1000, simLength);
        setTime((prev) => (Math.abs(prev - t) > 0.06 ? t : prev));
        if (t >= simLength) setEnded(true);
      } else if (v && !v.paused) {
        const t = v.currentTime;
        setTime((prev) => (Math.abs(prev - t) > 0.06 ? t : prev));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [missing, hero.introOffset]);

  // Play with sound by default. Browsers block unmuted autoplay until the
  // visitor interacts, so we try unmuted first and, if the browser refuses,
  // start muted and unmute on the first gesture (pointer, key, touch, scroll).
  useEffect(() => {
    if (missing) return;
    const v = videoRef.current;
    if (!v) return;

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    const unmute = () => {
      v.muted = false;
      v.volume = 1;
      void v.play();
      events.forEach((e) => window.removeEventListener(e, unmute));
    };

    const start = async () => {
      v.muted = false;
      v.volume = 1;
      try {
        await v.play();
      } catch {
        // Autoplay-with-sound was blocked: play muted, unmute on first gesture.
        v.muted = true;
        try {
          await v.play();
        } catch {
          /* ignore */
        }
        events.forEach((e) => window.addEventListener(e, unmute, { once: true, passive: true }));
      }
    };
    void start();

    return () => events.forEach((e) => window.removeEventListener(e, unmute));
  }, [missing]);

  const captions = useMemo(
    () => hero.captions.map((c) => ({ ...c, t: c.t + hero.introOffset })),
    [hero]
  );
  const overlays = useMemo(
    () => hero.overlays.map((o) => ({ ...o, t: o.t + hero.introOffset })),
    [hero]
  );

  const activeCaption = useMemo(() => {
    let current = null as null | { t: number; text: string };
    for (const c of captions) if (time >= c.t) current = c;
    return current;
  }, [captions, time]);

  const workCards = overlays.filter((o) => o.type === 'work' && time >= o.t);
  const showInstagram = overlays.some((o) => o.type === 'instagram' && time >= o.t);
  const showCue = ended || overlays.some((o) => o.type === 'scrollCue' && time >= o.t);

  const replay = () => {
    const v = videoRef.current;
    setEnded(false);
    if (v) {
      v.currentTime = 0;
      v.muted = false;
      void v.play();
    } else {
      setMissing(false);
      setTimeout(() => setMissing(true), 0);
    }
  };

  return (
    <section id="top" className="relative h-[100svh] overflow-hidden bg-bg">
      {/* Film */}
      {!missing && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={hero.videoSrc}
          poster={hero.posterSrc}
          autoPlay
          playsInline
          preload="auto"
          onEnded={() => setEnded(true)}
          onError={() => setMissing(true)}
        />
      )}
      {missing && (
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_78%,oklch(24%_0.03_60)_0%,var(--bg)_62%)]" />
      )}

      {/* Legibility scrim over the caption zone only */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_12%_92%,oklch(10%_0.01_60/0.85)_0%,transparent_60%)]" />

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[var(--gutter)] py-5">
        <div>
          <p className="display text-xl leading-none">{site.name}</p>
          <p className="exif mt-1">
            {site.city} <b>·</b> {site.role}
          </p>
        </div>
        <a
          href="#contact"
          className="exif border border-line px-4 py-2 transition-colors duration-300 ease-out-expo hover:border-amber hover:text-amber"
          style={{ color: 'var(--ink)' }}
        >
          Book a shoot
        </a>
      </header>

      {/* Kinetic captions, timed to the voiceover */}
      <div className="absolute bottom-[9rem] left-[var(--gutter)] z-10 max-w-[min(58rem,72vw)] md:bottom-[7rem]">
        {activeCaption && (
          <h1 key={activeCaption.t} className="display display-hero" aria-live="off">
            {activeCaption.text.split(' ').map((w, i) => (
              <span key={i} className="caption-word" style={{ animationDelay: `${i * 55}ms` }}>
                {w}&nbsp;
              </span>
            ))}
          </h1>
        )}
        {!activeCaption && (
          <h1 className="sr-only">
            {site.name}, {site.role} in {site.city}
          </h1>
        )}
      </div>

      {/* Right rail: work beats, then Instagram */}
      <aside className="absolute right-[var(--gutter)] top-1/2 z-10 hidden w-[19rem] -translate-y-1/2 flex-col gap-3 md:flex">
        {workCards.map((card) => (
          <figure
            key={card.category}
            className="caption-word flex items-center gap-3 border border-line bg-raise/95 p-2.5"
            style={{ animationDuration: '0.7s' }}
          >
            <div className="relative h-16 w-20 shrink-0 overflow-hidden">
              {card.image && (
                <Image src={card.image} alt={`${card.category} photography sample`} fill sizes="80px" className="object-cover" />
              )}
            </div>
            <figcaption>
              <p className="display text-2xl leading-none">{card.category}</p>
              <p className="exif mt-1">{card.exif}</p>
            </figcaption>
          </figure>
        ))}

        {showInstagram && (
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noreferrer"
            className="caption-word group border border-amber bg-raise/95 p-4 transition-colors duration-300 ease-out-expo hover:bg-amber"
            style={{ animationDuration: '0.7s' }}
          >
            <p className="exif" style={{ color: 'var(--amber)' }}>
              Daily updates
            </p>
            <p className="display mt-1 text-3xl leading-none transition-colors duration-300 group-hover:text-bg">
              @{site.instagram.handle}
            </p>
            <p className="exif mt-2 transition-colors duration-300 group-hover:text-bg">Open Instagram ↗</p>
          </a>
        )}
      </aside>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-[var(--gutter)] pb-6">
        <div className="flex items-center gap-3">
          {ended && (
            <button
              onClick={replay}
              className="exif border border-line bg-raise/90 px-4 py-2 transition-colors duration-300 ease-out-expo hover:border-amber"
              style={{ color: 'var(--ink)' }}
            >
              Replay
            </button>
          )}
        </div>

        {showCue && (
          <a href="#work" className="exif flex flex-col items-center gap-1" style={{ color: 'var(--amber)' }}>
            Scroll to the work
            <span className="scroll-cue-arrow text-base leading-none">↓</span>
          </a>
        )}
      </div>

      {/* Setup notice, dev only, shown when the film is not in place */}
      {missing && (
        <p className="exif absolute bottom-6 left-1/2 z-20 -translate-x-1/2 border border-line bg-raise px-3 py-2">
          Drop the stitched film at <b>public/videos/hero.mp4</b> to replace this preview
        </p>
      )}
    </section>
  );
}
