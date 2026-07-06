import type { SiteConfig } from '@/lib/types';

export default function Footer({ site }: { site: SiteConfig }) {
  const year = new Date().getFullYear();
  return (
    <footer data-section="footer" className="border-t border-line px-[var(--gutter)] pb-10 pt-[var(--space-section)]">
      <p className="display text-[clamp(4rem,17vw,17rem)] leading-[0.85] text-raise" aria-hidden="true">
        Dawood
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="exif">
          © {year} {site.name} <b>·</b> {site.city}
        </p>
        <nav className="exif flex gap-6">
          <a href={site.instagram.url} target="_blank" rel="noreferrer" className="hover:text-amber">
            Instagram
          </a>
          <a href={`mailto:${site.email}`} className="hover:text-amber">
            Email
          </a>
          <a href="#top" className="hover:text-amber">
            Back to top ↑
          </a>
        </nav>
      </div>
    </footer>
  );
}
