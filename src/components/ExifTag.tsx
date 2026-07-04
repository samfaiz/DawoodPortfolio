/**
 * EXIF tag. Camera metadata as the site's labeling system:
 * section eyebrows, card captions, footer data. Always mono, always quiet.
 */
export default function ExifTag({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`exif flex items-center gap-3 ${className}`}>
      <span className="aperture-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
