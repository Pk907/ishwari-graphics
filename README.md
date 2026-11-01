# Ishwari Graphics — website

React + Vite, Tailwind CSS v4, GSAP (ScrollTrigger), Framer Motion and Lenis.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production files in dist/
```

## Before going live

All placeholder content is marked `TODO`:

- `src/config.js`: WhatsApp number, phone, address, hours, Google rating and review count.
- `src/data.js`: portfolio projects (`WORK`), prices (`PRICES`), stats (`STATS`) and sample reviews (`REVIEWS`). The sample reviews must be replaced with real ones.
- `index.html`: telephone, address and URL in the LocalBusiness JSON-LD, plus `canonical`, `og:url` and `og:image` once the domain and a share image exist.

The portfolio posters are drawn in CSS (`<Poster>` in `src/components/ui.jsx`). To use real work, add an `img` field to each `WORK` item and render an `<img loading="lazy">` (AVIF/WebP) inside `Poster`.

## Where things live

| Section | File |
|---|---|
| CMYK intro | `src/components/Intro.jsx` |
| Hero (poster stack, word swap, parallax) | `src/components/Hero.jsx` |
| Services (horizontal pin + demos) | `src/components/Services.jsx` |
| Portfolio (filters, masonry, lightbox) | `src/components/Portfolio.jsx` |
| Order booking → WhatsApp | `src/components/Order.jsx` |
| Nav, marquee, stats, reviews, contact, footer | `src/components/Sections.jsx` |
| Custom cursor | `src/components/Cursor.jsx` |
| Lenis + GSAP setup | `src/lib/motion.js` |
| Design tokens and styles | `src/index.css` |

Motion respects `prefers-reduced-motion`; the cursor and magnetic buttons only run on mouse/trackpad devices.

Orders are sent as a prefilled WhatsApp message. Files can't be attached through a WhatsApp link, so customers send them in the chat. Uploading files on the site needs a small backend (for example a serverless function plus storage).
