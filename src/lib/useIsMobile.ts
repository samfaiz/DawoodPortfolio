'use client';

import { useEffect, useState } from 'react';

/**
 * True on small / touch devices. Used to gate expensive desktop-only work
 * (Three.js, canvas frame-scrubbing, Lenis smoothing). Returns false during
 * SSR and the first client render, then resolves in an effect — safe for
 * conditionally mounting heavy client-only components.
 */
export function useIsMobile(query = '(max-width: 767px), (pointer: coarse)') {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return isMobile;
}
