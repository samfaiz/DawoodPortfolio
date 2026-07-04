import Image from 'next/image';
import type { SiteConfig, WorkItem } from '@/lib/types';
import ExifTag from './ExifTag';

/**
 * Instagram section.
 *
 * mode "manual" (default): renders a curated grid from the gallery items and
 * links every tile to the profile. Zero API dependencies, launch-safe.
 *
 * Phase 4 upgrades, switched via site.json instagram.mode:
 *  - "behold": drop a Behold.so feed id into an env var and fetch its JSON
 *    here (10 minute setup, no Meta app).
 *  - "graph": Laravel proxies the Meta Graph API (Business/Creator account),
 *    caches the feed and refreshes the 60 day token on a schedule; this
 *    component then fetches /api/instagram from the CMS.
 */
export default function InstagramFeed({ site, tiles }: { site: SiteConfig; tiles: WorkItem[] }) {
  return (
    <section className="border-t border-line px-[var(--gutter)] py-[var(--space-section)]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <ExifTag>Daily updates</ExifTag>
          <h2 className="display display-section mt-4">@{site.instagram.handle}</h2>
        </div>
        <a
          href={site.instagram.url}
          target="_blank"
          rel="noreferrer"
          className="exif border border-amber px-5 py-3 transition-colors duration-300 ease-out-expo hover:bg-amber hover:text-bg"
          style={{ color: 'var(--amber)' }}
        >
          Follow on Instagram ↗
        </a>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {tiles.slice(0, 6).map((t) => (
          <a
            key={t.id}
            href={site.instagram.url}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-square overflow-hidden border border-line"
            aria-label={`${t.title} on Instagram`}
          >
            <Image
              src={t.src}
              alt={t.title}
              fill
              sizes="(max-width: 640px) 50vw, 16vw"
              className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
