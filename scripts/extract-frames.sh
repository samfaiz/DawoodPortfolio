#!/usr/bin/env bash
# Extract the scrub frame sequence from the middle film.
# Requires ffmpeg. Run from the project root:  npm run frames
set -euo pipefail

SRC="public/videos/middle.mp4"
OUT="public/frames/middle"
HERO="public/videos/hero.mp4"

if [ ! -f "$SRC" ]; then
  echo "Missing $SRC. Download the 10s studio clip from Higgsfield and place it there first."
  exit 1
fi

mkdir -p "$OUT"
rm -f "$OUT"/frame_*.webp

# 1600px wide WebP frames at the clip's native frame rate.
# Quality 78 keeps the whole 10s sequence around 8 to 12 MB.
ffmpeg -hide_banner -loglevel error -i "$SRC" \
  -vf "scale=1600:-2" -c:v libwebp -quality 78 -lossless 0 \
  "$OUT/frame_%04d.webp"

COUNT=$(ls "$OUT" | wc -l | tr -d ' ')
echo "Extracted $COUNT frames to $OUT"
echo "Now set \"frameCount\": $COUNT in content/beats.json"

# Bonus: a poster for the hero film, if it is in place.
if [ -f "$HERO" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$HERO" -vframes 1 -q:v 3 public/videos/hero-poster.jpg
  echo "Wrote public/videos/hero-poster.jpg"
fi
