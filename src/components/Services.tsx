import type { ServiceItem } from '@/lib/types';
import ExifTag from './ExifTag';

export default function Services({ services }: { services: ServiceItem[] }) {
  return (
    <section id="services" className="border-t border-line px-[var(--gutter)] py-[var(--space-section)]">
      <ExifTag>Commissions</ExifTag>
      <h2 className="display display-section mt-4">What I shoot</h2>

      <div className="mt-10 border-t border-line">
        {services.map((s) => (
          <article
            key={s.id}
            className="group grid gap-4 border-b border-line py-8 transition-colors duration-500 ease-out-expo md:grid-cols-[1.2fr_1.6fr_auto] md:items-baseline md:gap-10"
          >
            <h3 className="display text-[clamp(1.9rem,3.4vw,3rem)] transition-colors duration-300 group-hover:text-amber">
              {s.title}
            </h3>
            <div>
              <p className="max-w-xl text-muted">{s.blurb}</p>
              <p className="exif mt-3">{s.deliverables}</p>
            </div>
            <p className="exif md:text-right" style={{ color: 'var(--amber)' }}>
              {s.from}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
