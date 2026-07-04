# Dawood Shaikh — Portfolio

Cinematic scroll-driven portfolio for a Dubai photographer. Next.js 15 (App Router, TypeScript, Tailwind), GSAP ScrollTrigger + Lenis smooth scroll, React Three Fiber, and a scroll-scrubbed film section driven by an extracted frame sequence.

The build compiles clean: `npm run typecheck` and `npm run build` both pass as shipped.

---

## 1. Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The site runs immediately, even before the films are in place: the hero plays its caption choreography on an internal clock and the scrub section shows a styled placeholder. You will see small "drop the film here" notices until step 2 is done.

## 2. Place the two films

Download both finals from your Higgsfield library (Assets → the two completed jobs):

| File | Source job | Destination |
|---|---|---|
| Stitched hero film (~20s, with voiceover) | the Explainer/stitch job | `public/videos/hero.mp4` |
| Studio clip (10s, silent, head choreography) | the 10s Seedance job | `public/videos/middle.mp4` |

## 3. Extract the scrub frames

Requires `ffmpeg` (macOS: `brew install ffmpeg`, Ubuntu: `apt install ffmpeg`).

```bash
npm run frames
```

The script writes `public/frames/middle/frame_0001.webp …`, prints the frame count, and generates `public/videos/hero-poster.jpg`. Copy the printed count into `content/beats.json` → `frameCount`.

No frames yet? The scrub section automatically falls back to scrubbing the mp4 directly. Frames are smoother and the mobile-safe path, so run the script before going live.

## 4. Replace the placeholders

Everything editable lives in `/content`. No component changes needed.

| File | What to change |
|---|---|
| `site.json` | `whatsapp` (international format, no +), `email`, `instagram.handle` and `url` |
| `work.json` | Swap Unsplash `src` URLs for your real photos. Drop files in `public/images/work/` and reference `/images/work/name.jpg`. `floatingCards` picks the six ids that float in the scrub section. |
| `about.json` | Portrait, bio paragraphs, stats, gear list |
| `services.json` | Pricing lines and deliverables |
| `testimonials.json` | Real client quotes |

## 5. Tune the choreography (optional, satisfying)

Open `http://localhost:3000?debug=1` and scroll: a live readout shows scroll progress `p`, film time `t`, and frame index.

- **`content/hero.json`** — caption lines and overlay beats are timestamps *within the 15s talking clip*; `introOffset: 5` shifts everything past the 5s Hasselblad opening. If a card lands a beat early or late, nudge its `t` by ±0.2.
- **`content/beats.json`** — `timeMap` maps scroll progress to film time (piecewise). The default holds match the generated head turns: straight → left → right → center → down. `cardPhases` controls when the floating cards enter, drift with his gaze, and fall into the gallery.

## 6. Deploy to your VPS (PM2 + Nginx)

Same pattern as your existing deployments:

```bash
# on the VPS
git clone <repo> dawood-portfolio && cd dawood-portfolio
npm ci && npm run build
pm2 start npm --name dawood-portfolio -- start   # serves on :3000
pm2 save
```

Nginx server block (then `certbot --nginx` for SSL):

```nginx
server {
    server_name dawoodshaikh.com www.dawoodshaikh.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    location /videos/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location /frames/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## 7. Phase 4 — Laravel CMS contract

The JSON files in `/content` are the API contract. When the CMS lands, each Laravel endpoint returns exactly one file's shape, and the only code that changes is `src/lib/content.ts` (swap the import for a `fetch` with `next: { revalidate, tags }`).

| Endpoint | Returns shape of | Admin edits |
|---|---|---|
| `GET /api/site` | `site.json` | Contact details, socials, SEO |
| `GET /api/hero` | `hero.json` | Film URL, caption timings, overlay beats |
| `GET /api/beats` | `beats.json` | Scrub timing map |
| `GET /api/work` | `work.json` | Gallery items via media library |
| `GET /api/services` | `services.json` | Service rows and pricing |
| `GET /api/testimonials` | `testimonials.json` | Quotes |
| `GET /api/about` | `about.json` | Bio, stats, gear |
| `POST /api/leads` | — | Receives the contact form (wire `src/app/api/contact/route.ts` to forward) |

Instagram: `site.json → instagram.mode` supports three strategies, documented in `src/components/InstagramFeed.tsx` (manual grid now; Behold.so or a Laravel-proxied Meta Graph feed later).

## 8. What's in the box

```
content/            editable JSON (the CMS contract)
public/videos/      hero.mp4 + middle.mp4 go here (gitignored)
public/frames/      generated scrub frames (gitignored)
scripts/            extract-frames.sh (ffmpeg)
src/app/            layout, page, globals.css, /api/contact
src/components/     Preloader, Hero, Marquee, ScrubSection, CameraRig3D,
                    Gallery, About, Services, Testimonials, InstagramFeed,
                    Contact, Footer, SmoothScroll, ExifTag
src/lib/            types.ts, content.ts (the Laravel seam)
```

Accessibility and fallbacks are built in: `prefers-reduced-motion` swaps every scroll effect for static layouts, the hero mirrors its voiceover as captions, keyboard focus is visible throughout, and the lightbox supports Esc / arrow keys.
