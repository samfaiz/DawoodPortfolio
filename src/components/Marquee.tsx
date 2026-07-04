const WORDS = ['Product', 'Models', 'Events', 'Dubai', 'Studio', 'On location'];

/**
 * Ticker between the hero and the work section. Pure CSS, duplicated track.
 */
export default function Marquee() {
  const row = (ariaHidden: boolean) => (
    <span aria-hidden={ariaHidden || undefined} className="flex shrink-0 items-center">
      {WORDS.map((w) => (
        <span key={w + (ariaHidden ? 'b' : 'a')} className="flex items-center">
          <span className="display px-6 text-[clamp(1.8rem,4vw,3.4rem)] text-muted md:px-10">{w}</span>
          <span className="aperture-dot" />
        </span>
      ))}
    </span>
  );

  return (
    <div className="overflow-hidden border-y border-line py-4">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
