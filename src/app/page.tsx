import {
  getAbout,
  getBeats,
  getHero,
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

export default async function Page() {
  const [site, hero, beats, work, about, services, testimonials] = await Promise.all([
    getSite(),
    getHero(),
    getBeats(),
    getWork(),
    getAbout(),
    getServices(),
    getTestimonials(),
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
    </main>
  );
}
