/**
 * Content layer — the Laravel CMS seam.
 *
 * When CMS_URL is set, each getter fetches one section from the headless
 * Laravel API (GET ${CMS_URL}/api/{section}) with ISR caching (revalidate +
 * a cache tag per section, so the CMS can purge on save). If CMS_URL is unset
 * or the request fails, it falls back to the JSON bundled in /content, so the
 * site always renders — even offline or before the CMS is deployed.
 *
 * The JSON shapes in /content ARE the API contract; the Laravel endpoints
 * return exactly these shapes, so components never change.
 */
import siteLocal from '../../content/site.json';
import heroLocal from '../../content/hero.json';
import beatsLocal from '../../content/beats.json';
import workLocal from '../../content/work.json';
import servicesLocal from '../../content/services.json';
import testimonialsLocal from '../../content/testimonials.json';
import aboutLocal from '../../content/about.json';

import type {
  AboutConfig,
  BeatsConfig,
  HeroConfig,
  ServiceItem,
  SiteConfig,
  Testimonial,
  WorkConfig,
} from './types';

const CMS_URL = process.env.CMS_URL?.replace(/\/$/, '');

/** How long (seconds) a fetched section is cached before revalidating. */
const REVALIDATE = 300;

/**
 * Fetch one section from the CMS, falling back to the bundled JSON on any
 * problem (no CMS_URL, network error, non-2xx, or bad JSON).
 */
async function fetchSection<T>(key: string, fallback: T): Promise<T> {
  if (!CMS_URL) return fallback;

  try {
    const res = await fetch(`${CMS_URL}/api/${key}`, {
      next: { revalidate: REVALIDATE, tags: [`content:${key}`] },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getSite(): Promise<SiteConfig> {
  return fetchSection<SiteConfig>('site', siteLocal as SiteConfig);
}

export async function getHero(): Promise<HeroConfig> {
  return fetchSection<HeroConfig>('hero', heroLocal as HeroConfig);
}

export async function getBeats(): Promise<BeatsConfig> {
  return fetchSection<BeatsConfig>('beats', beatsLocal as unknown as BeatsConfig);
}

export async function getWork(): Promise<WorkConfig> {
  return fetchSection<WorkConfig>('work', workLocal as WorkConfig);
}

export async function getServices(): Promise<ServiceItem[]> {
  const data = await fetchSection<{ items: ServiceItem[] }>(
    'services',
    servicesLocal as { items: ServiceItem[] }
  );
  return data.items;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const data = await fetchSection<{ items: Testimonial[] }>(
    'testimonials',
    testimonialsLocal as { items: Testimonial[] }
  );
  return data.items;
}

export async function getAbout(): Promise<AboutConfig> {
  return fetchSection<AboutConfig>('about', aboutLocal as AboutConfig);
}
