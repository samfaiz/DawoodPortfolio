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
async function fetchSection<T>(key: string, fallback: T, fresh = false): Promise<T> {
  if (!CMS_URL) return fallback;

  try {
    // In the visual editor (fresh) we bypass the ISR cache so saved edits show
    // immediately; public requests stay cached and revalidate on a schedule.
    const res = await fetch(
      `${CMS_URL}/api/${key}`,
      fresh ? { cache: 'no-store' } : { next: { revalidate: REVALIDATE, tags: [`content:${key}`] } }
    );
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getSite(fresh = false): Promise<SiteConfig> {
  return fetchSection<SiteConfig>('site', siteLocal as SiteConfig, fresh);
}

export async function getHero(fresh = false): Promise<HeroConfig> {
  return fetchSection<HeroConfig>('hero', heroLocal as HeroConfig, fresh);
}

export async function getBeats(fresh = false): Promise<BeatsConfig> {
  return fetchSection<BeatsConfig>('beats', beatsLocal as unknown as BeatsConfig, fresh);
}

export async function getWork(fresh = false): Promise<WorkConfig> {
  return fetchSection<WorkConfig>('work', workLocal as WorkConfig, fresh);
}

export async function getServices(fresh = false): Promise<ServiceItem[]> {
  const data = await fetchSection<{ items: ServiceItem[] }>(
    'services',
    servicesLocal as { items: ServiceItem[] },
    fresh
  );
  return data.items;
}

export async function getTestimonials(fresh = false): Promise<Testimonial[]> {
  const data = await fetchSection<{ items: Testimonial[] }>(
    'testimonials',
    testimonialsLocal as { items: Testimonial[] },
    fresh
  );
  return data.items;
}

export async function getAbout(fresh = false): Promise<AboutConfig> {
  return fetchSection<AboutConfig>('about', aboutLocal as AboutConfig, fresh);
}
