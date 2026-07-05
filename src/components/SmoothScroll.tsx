'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll shell. Lenis drives the scroll position; GSAP's ticker
 * drives Lenis; ScrollTrigger listens to Lenis. One clock, no fighting.
 * Respects prefers-reduced-motion by not mounting Lenis at all.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Skip Lenis on touch devices: native momentum scroll is smoother there and
    // this drops a rAF loop that would otherwise fight the phone's scroller.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || touch) return;

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
