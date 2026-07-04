'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const STOPS = ['F/22', 'F/16', 'F/11', 'F/8', 'F/5.6', 'F/2.8', 'F/1.4'];

/**
 * Aperture preloader. Six blades close the screen; the f-stop counts down
 * as assets settle; then the iris opens onto the hero. Skipped entirely
 * under prefers-reduced-motion.
 */
export default function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stopIndex, setStopIndex] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setGone(true);
      return;
    }

    let i = 0;
    const stepper = window.setInterval(() => {
      i = Math.min(i + 1, STOPS.length - 1);
      setStopIndex(i);
      if (i === STOPS.length - 1) window.clearInterval(stepper);
    }, 180);

    const open = () => {
      const el = rootRef.current;
      if (!el) return setGone(true);
      gsap.to(el, {
        clipPath: 'circle(150% at 50% 50%)',
        duration: 1.1,
        ease: 'expo.inOut',
        delay: 0.25,
        onComplete: () => setGone(true),
      });
      gsap.to(el.querySelector('[data-iris]'), {
        scale: 6,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.in',
      });
    };

    // Open when the page has loaded, but never before the count finishes
    // and never later than 2.6s. First paint should feel intentional, not slow.
    const minWait = window.setTimeout(() => {
      if (document.readyState === 'complete') open();
      else {
        window.addEventListener('load', open, { once: true });
        window.setTimeout(open, 1200);
      }
    }, 1400);

    return () => {
      window.clearInterval(stepper);
      window.clearTimeout(minWait);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[90] grid place-items-center bg-bg"
      style={{ clipPath: 'circle(150% at 50% 50%)' }}
      aria-hidden="true"
    >
      <div data-iris className="relative grid place-items-center">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="56" stroke="var(--line)" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="34" stroke="var(--amber)" strokeWidth="1.5" />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            const x1 = 60 + Math.cos(a) * 34;
            const y1 = 60 + Math.sin(a) * 34;
            const x2 = 60 + Math.cos(a + 0.9) * 56;
            const y2 = 60 + Math.sin(a + 0.9) * 56;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1.5" />;
          })}
        </svg>
        <span className="exif absolute -bottom-8 tabular-nums" style={{ color: 'var(--amber)' }}>
          {STOPS[stopIndex]}
        </span>
      </div>
    </div>
  );
}
