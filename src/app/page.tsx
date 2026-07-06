import {
  getAbout,
  getBeats,
  getHero,
  getOverrides,
  getServices,
  getSite,
  getTestimonials,
  getWork,
} from '@/lib/content';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import ScrubSection from '@/components/ScrubSection';
import CameraRig3D from '@/components/CameraRig3D';
import Gallery from '@/components/Gallery';
import About from '@/components/About';
import Services from '@/components/Services';
import Testimonials from '@/components/Testimonials';
import InstagramFeed from '@/components/InstagramFeed';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import OverrideRenderer from '@/components/OverrideRenderer';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // In the admin's visual editor (?visualEdit=1) fetch fresh so saved edits
  // show immediately; otherwise use the cached (ISR) content.
  const fresh = (await searchParams).visualEdit !== undefined;

  const [site, hero, beats, work, about, services, testimonials, overrides] = await Promise.all([
    getSite(fresh),
    getHero(fresh),
    getBeats(fresh),
    getWork(fresh),
    getAbout(fresh),
    getServices(fresh),
    getTestimonials(fresh),
    getOverrides(fresh),
  ]);

  const floating = work.floatingCards
    .map((id) => work.items.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <main>
      <Hero hero={hero} site={site} />
      <Marquee />
      <ScrubSection beats={beats} cards={floating} />
      <Gallery work={work} />
      <CameraRig3D />
      <About about={about} />
      <Services services={services} />
      <Testimonials items={testimonials} />
      <InstagramFeed site={site} tiles={work.items} />
      <Contact site={site} />
      <Footer site={site} />
      {/* Bootstrap for the visual editor + applier for the public site. */}
      <script
        id="__overrides"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(overrides) }}
      />
      <OverrideRenderer overrides={overrides} />
    </main>
  );
}
