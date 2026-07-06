import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { getSite } from '@/lib/content';
import SmoothScroll from '@/components/SmoothScroll';
import VisualEditor from '@/components/VisualEditor';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();

  return {
    title: {
      default: site.seo.title,
      template: `%s | ${site.name}`,
    },
    description: site.seo.description,
    openGraph: {
      title: site.seo.title,
      description: site.seo.description,
      type: 'website',
      locale: 'en_AE',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Overrides are injected by page.tsx (see the __overrides script tag and
  // <OverrideRenderer> mount there) so the fetch stays inside the ISR
  // segment and layout remains statically renderable.
  return (
    <html lang="en">
      <body className="grain">
        <SmoothScroll>{children}</SmoothScroll>
        <Suspense fallback={null}>
          <VisualEditor />
        </Suspense>
      </body>
    </html>
  );
}
