import Image from 'next/image';
import type { AboutConfig } from '@/lib/types';
import ExifTag from './ExifTag';

export default function About({ about }: { about: AboutConfig }) {
  return (
    <section id="about" className="border-t border-line px-[var(--gutter)] py-[var(--space-section)]">
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <ExifTag>Behind the camera</ExifTag>
          <h2 className="display display-section mt-4">
            Ten years of
            <br />
            planned light
          </h2>
          <div className="mt-6 max-w-xl space-y-4 text-muted">
            {about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {about.stats.map((s) => (
              <div key={s.label}>
                <dt className="exif order-2">{s.label}</dt>
                <dd className="display text-4xl" style={{ color: 'var(--amber)' }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="exif mt-10">
            In the bag: {about.gear.join(' · ')}
          </p>
        </div>

        <figure className="relative min-h-[26rem] overflow-hidden border border-line md:min-h-0">
          <Image
            src={about.portrait}
            alt={about.portraitAlt}
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover"
          />
          <figcaption className="exif absolute bottom-3 left-3 bg-raise/90 px-3 py-1.5">
            Self portrait <b>·</b> F/2 <b>·</b> 50MM
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
