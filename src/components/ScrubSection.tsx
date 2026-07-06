'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { BeatsConfig, WorkItem } from '@/lib/types';
import ExifTag from './ExifTag';
import { useIsMobile } from '@/lib/useIsMobile';

gsap.registerPlugin(ScrollTrigger);

/**
 * The signature section. The middle film (Dawood seated, head choreography:
 * straight, left, right, center, down) is scrubbed by scroll.
 *
 * Engine order of preference:
 *   1. Extracted frame sequence drawn to canvas (run `npm run frames` once).
 *   2. Direct <video> currentTime scrubbing (works before frames exist).
 *   3. A styled placeholder that keeps layout intact.
 *
 * The work photos ride a 3D ring (carousel) orbiting the subject. The ring's
 * Y-rotation tracks his gaze: he looks LEFT -> the ring spins left so cards
 * sweep right-to-left; he looks RIGHT -> it spins the other way (left-to-right);
 * back to centre when he faces forward; then the whole ring drops away into the
 * gallery as he looks down. Add ?debug=1 to the URL to see live progress.
 */

const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const DEG = Math.PI / 180;

export default function ScrubSection({ beats, cards }: { beats: BeatsConfig; cards: WorkItem[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const progressRef = useRef(0);
  const shownTimeRef = useRef(0);
  const modeRef = useRef<'frames' | 'video' | 'none'>('none');
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedRef = useRef<boolean[]>([]);

  const [reduced, setReduced] = useState(false);
  const [debug, setDebug] = useState<{ p: number; t: number; f: number } | null>(null);
  const isMobile = useIsMobile();

  // The photos placed on the ring (up to eight reads well in 3D).
  const ringCards = useMemo(() => cards.slice(0, 8), [cards]);
  const count = ringCards.length || 1;
  // Each card's fixed angular seat around the circle.
  const seats = useMemo(
    () => ringCards.map((_, i) => (360 / count) * i),
    [ringCards, count]
  );

  const timeFor = useMemo(() => {
    const map = beats.timeMap;
    return (p: number) => {
      if (p <= map[0].p) return map[0].t;
      for (let i = 1; i < map.length; i++) {
        if (p <= map[i].p) {
          const u = (p - map[i - 1].p) / (map[i].p - map[i - 1].p);
          return lerp(map[i - 1].t, map[i].t, u);
        }
      }
      return map[map.length - 1].t;
    };
  }, [beats]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      return;
    }
    const wantsDebug = new URLSearchParams(window.location.search).has('debug');

    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const frameBox = frameBoxRef.current;
    const ring = ringRef.current;
    if (!stage || !canvas || !frameBox || !ring) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---------------- frame / video engine ---------------- */
    const frameUrl = (i: number) =>
      `${beats.framesFolder}/${beats.framePrefix}${String(i + 1).padStart(4, '0')}.${beats.frameExt}`;

    const drawCover = (source: CanvasImageSource, sw: number, sh: number) => {
      const cw = canvas.width;
      const ch = canvas.height;
      if (!sw || !sh || !cw || !ch) return;
      const scale = Math.max(cw / sw, ch / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    const render = () => {
      // One clock both the film frame AND the ring read from, so the photos turn
      // exactly when his head turns. Desktop: the eased scrubbed video time.
      // Mobile: a scroll-mapped pseudo-time (the video plays on its own).
      let tsec: number;
      if (!isMobile) {
        const target = timeFor(progressRef.current);
        // Ease the displayed time toward the target for a weighted, filmic scrub.
        shownTimeRef.current = lerp(shownTimeRef.current, target, 0.18);
        tsec = shownTimeRef.current;

        if (modeRef.current === 'frames') {
          let idx = Math.round((tsec / beats.duration) * (beats.frameCount - 1));
          idx = Math.min(beats.frameCount - 1, Math.max(0, idx));
          while (idx > 0 && !loadedRef.current[idx]) idx--;
          const img = imagesRef.current[idx];
          if (img) drawCover(img, img.naturalWidth, img.naturalHeight);
          if (wantsDebug) setDebug({ p: progressRef.current, t: tsec, f: idx });
        } else if (modeRef.current === 'video') {
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            if (Math.abs(v.currentTime - tsec) > 1 / 30) v.currentTime = tsec;
            drawCover(v, v.videoWidth, v.videoHeight);
          }
          if (wantsDebug) setDebug({ p: progressRef.current, t: tsec, f: -1 });
        }
      } else {
        tsec = progressRef.current * beats.duration;
      }

      layout(progressRef.current, tsec);
    };

    const startFrames = () => {
      modeRef.current = 'frames';
      imagesRef.current = new Array(beats.frameCount).fill(null);
      loadedRef.current = new Array(beats.frameCount).fill(false);
      let next = 0;
      let active = 0;
      const pump = () => {
        while (active < 6 && next < beats.frameCount) {
          const i = next++;
          active++;
          const img = new window.Image();
          img.onload = () => {
            imagesRef.current[i] = img;
            loadedRef.current[i] = true;
            active--;
            pump();
          };
          img.onerror = () => {
            active--;
            pump();
          };
          img.src = frameUrl(i);
        }
      };
      pump();
    };

    if (isMobile) {
      // Mobile: play the film as a muted looping background (hardware-decoded,
      // cheap) instead of loading 240 frames or seeking per scroll tick.
      const v = videoRef.current;
      if (v) {
        v.src = beats.videoSrc;
        v.loop = true;
        v.muted = true;
        void v.play().catch(() => {});
      }
    } else {
      const probe = new window.Image();
      probe.onload = () => startFrames();
      probe.onerror = () => {
        const v = videoRef.current;
        if (!v) return;
        v.src = beats.videoSrc;
        v.addEventListener('loadeddata', () => (modeRef.current = 'video'), { once: true });
        v.addEventListener('error', () => (modeRef.current = 'none'), { once: true });
        v.load();
      };
      probe.src = frameUrl(0);
    }

    /* ---------------- responsive canvas ---------------- */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = frameBox.clientWidth * dpr;
      canvas.height = frameBox.clientHeight * dpr;
      placeCards();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(frameBox);

    /* ---------------- 3D ring setup ---------------- */
    const narrow = () => window.innerWidth < 768;
    const phases = beats.cardPhases;

    // Ring radius from viewport, so cards orbit around the subject.
    const radiusFor = () =>
      narrow()
        ? Math.min(window.innerWidth * 0.44, 240)
        : Math.min(window.innerWidth * 0.33, 560);

    // Seat each card on the circle: rotate out, push to the radius, then
    // rotate back so every card still faces the camera (readable billboard).
    const placeCards = () => {
      const r = radiusFor();
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const a = seats[i];
        el.style.transform = `translate(-50%, -50%) rotateY(${a}deg) translateZ(${r}px) rotateY(${-a}deg)`;
      });
    };

    // Ring base orientation (GSAP owns the ring's transform matrix). The tilt
    // is negative so the prominent front card drops LOW (over his lap), leaving
    // his face clear in the open centre of the orbit; the far card rides high
    // and small over his head.
    gsap.set(ring, { xPercent: -50, yPercent: -50, rotationX: -16, transformOrigin: '50% 50%' });
    const ringRot = gsap.quickSetter(ring, 'rotationY', 'deg');
    const ringY = gsap.quickSetter(ring, 'y', 'px');
    const ringScale = gsap.quickSetter(ring, 'scale');
    const ringOpacity = gsap.quickSetter(ring, 'opacity');

    const cardSetters = cardRefs.current.map((el) => ({
      o: el ? gsap.quickSetter(el, 'opacity') : null,
      el,
    }));

    placeCards();

    const seg = (p: number, ph: { from: number; to: number }) =>
      clamp01((p - ph.from) / (ph.to - ph.from));

    // The gaze schedule expressed in FILM SECONDS (the progress-space cardPhases
    // mapped through the time map), so the ring keys off the exact frame shown.
    const T = {
      left: { from: timeFor(phases.left.from), to: timeFor(phases.left.to) },
      right: { from: timeFor(phases.right.from), to: timeFor(phases.right.to) },
      center: { from: timeFor(phases.center.from), to: timeFor(phases.center.to) },
      down: { from: timeFor(phases.down.from), to: timeFor(phases.down.to) },
    };
    const segT = (t: number, ph: { from: number; to: number }) =>
      clamp01((t - ph.from) / (ph.to - ph.from));

    const layout = (p: number, tsec: number) => {
      const mob = narrow();

      // Frame box grow — tied to scroll progress (the box expands as you enter).
      const grow = easeInOut(seg(p, phases.enter));
      const wVw = mob ? 88 : lerp(42, 60, grow);
      const hSvh = mob ? lerp(44, 60, grow) : lerp(58, 74, grow);
      const leftVw = mob ? 6 : lerp(4, (100 - wVw) / 2, grow);
      frameBox.style.width = `${wVw}vw`;
      frameBox.style.height = `${hSvh}svh`;
      frameBox.style.left = `${leftVw}vw`;

      if (introRef.current) {
        introRef.current.style.opacity = String(1 - grow);
        introRef.current.style.transform = `translateY(${grow * -30}px)`;
      }

      /* ----- gaze-driven ring rotation, keyed to FILM TIME so the photos
         turn exactly when his head turns (both read the same eased clock) ----- */
      const MAX = mob ? 46 : 60; // degrees the ring swings at full left / right
      const uL = easeInOut(segT(tsec, T.left));
      const uR = easeInOut(segT(tsec, T.right));
      const uC = easeInOut(segT(tsec, T.center));
      const gather = easeInOut(segT(tsec, T.down)); // 0..1 as he looks down

      // Looks left -> negative rotation (cards sweep right->left);
      // looks right -> positive; centre -> back to straight. No free drift, so
      // the ring never runs ahead of the head.
      let rot = 0;
      if (tsec < T.left.from) rot = 0;
      else if (tsec < T.right.from) rot = lerp(0, -MAX, uL);
      else if (tsec < T.center.from) rot = lerp(-MAX, MAX, uR);
      else if (tsec < T.down.from) rot = lerp(MAX, 0, uC);
      else rot = 0;

      // Ring appears as the box takes the stage.
      const appear = easeInOut(clamp01(seg(p, phases.enter) * 1.4));

      // Look down -> the photos gather in toward him (converge + shrink), slip
      // BEHIND the subject, and dissolve.
      ringRot(rot);
      ringScale(lerp(lerp(0.82, 1, appear), 0.34, gather));
      ringY(lerp(0, mob ? -20 : -30, gather)); // lift slightly as they gather in
      ringOpacity(appear * (1 - gather));

      // Tuck the whole ring behind the film (his image) while it gathers.
      if (ringWrapRef.current) {
        ringWrapRef.current.style.zIndex = gather > 0.4 ? '3' : '10';
      }

      // Per-card depth cue: brighten the ones facing us, dim the far side.
      // (Overall fade is handled by the ring's group opacity above.)
      cardSetters.forEach((s, i) => {
        if (!s.o || !s.el) return;
        const front = Math.cos((seats[i] + rot) * DEG); // 1 = facing us, -1 = behind
        const vis = (front + 1) / 2;
        let op = 0.16 + 0.74 * Math.pow(vis, 1.3);
        if (vis > 0.85) op *= lerp(1, 0.72, (vis - 0.85) / 0.15); // keep centre clear
        s.o(op);
        s.el.style.zIndex = String(10 + Math.round(vis * 20));
      });
    };

    /* ---------------- scroll wiring ---------------- */
    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      // Shorter pin distance on mobile so the section doesn't feel endless.
      end: isMobile ? '+=170%' : '+=320%',
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    gsap.ticker.add(render);
    layout(0, 0);

    return () => {
      gsap.ticker.remove(render);
      st.kill();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats, timeFor, seats, isMobile]);

  /* ---------------- reduced motion fallback ---------------- */
  if (reduced) {
    return (
      <section id="work" data-section="work" className="px-[var(--gutter)] py-[var(--space-section)]">
        <ExifTag>The studio</ExifTag>
        <h2 className="display display-section mt-4 max-w-4xl">A few samples of my work</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <figure key={c.id} className="border border-line bg-raise p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.title} className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <figcaption className="exif mt-2">{c.exif}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="work" data-section="work">
      <div ref={stageRef} className="relative h-[100svh] overflow-hidden bg-bg">
        {/* Film box */}
        <div
          ref={frameBoxRef}
          className="absolute top-1/2 z-[5] -translate-y-1/2 overflow-hidden border border-line bg-raise"
          style={{ width: '42vw', height: '58svh', left: '4vw' }}
        >
          <canvas ref={canvasRef} className={isMobile ? 'hidden' : 'h-full w-full'} />
          <video
            ref={videoRef}
            className={isMobile ? 'h-full w-full object-cover' : 'hidden'}
            muted
            loop={isMobile}
            playsInline
            preload={isMobile ? 'metadata' : 'auto'}
          />
          <p className="exif pointer-events-none absolute bottom-3 left-3">
            The studio <b>·</b> {isMobile ? 'in motion' : 'scrubbed by your scroll'}
          </p>
        </div>

        {/* Intro copy, fades as the film takes the stage */}
        <div
          ref={introRef}
          className="absolute right-[var(--gutter)] top-1/2 z-[6] w-[min(38rem,44vw)] -translate-y-1/2 max-md:left-[4vw] max-md:right-auto max-md:top-[8svh] max-md:w-[92vw] max-md:translate-y-0"
        >
          <ExifTag>Selected work</ExifTag>
          <h2 className="display display-section mt-4">
            A few samples of my work
          </h2>
          <p className="mt-5 max-w-md text-muted">
            Keep scrolling. The studio moves with you: I will look through the frames with you,
            left, right, and down into the full gallery.
          </p>
        </div>

        {/* 3D ring (carousel) of work photos orbiting the subject */}
        <div
          ref={ringWrapRef}
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
          style={{ perspective: '1900px' }}
        >
          <div
            ref={ringRef}
            className="relative h-0 w-0"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {ringCards.map((c, i) => (
              <div
                key={c.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute left-0 top-0 w-[clamp(8.5rem,12vw,14rem)] border border-line bg-raise p-2 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.title} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                <p className="exif mt-2">{c.category}</p>
              </div>
            ))}
          </div>
        </div>

        {debug && (
          <p className="exif absolute right-4 top-4 z-30 border border-line bg-raise px-3 py-2 tabular-nums">
            p {debug.p.toFixed(3)} <b>·</b> t {debug.t.toFixed(2)}s <b>·</b> f {debug.f}
          </p>
        )}
      </div>
    </section>
  );
}
