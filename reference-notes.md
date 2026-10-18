# Reference notes

Reference URL: https://pykidsacad-8e8rpmce.manus.space/

The reference presents a kid-friendly Python safari with 12 lessons grouped into three phases. Its key interaction model is a phase roadmap followed by lesson cards; each lesson exposes an Explore action. The visual language uses playful illustrated hero art, warm paper cards, colorful phase accents, and a progression narrative. The current I Developer Academy implementation adapts the structural idea into its own blue/indigo/emerald visual system and bilingual RTL/LTR layout rather than copying the reference branding.

## Live-site crawl (public marketing content)

Reference URL: https://ideveloper-academy.com/

A browser-visible crawl of the live site was used as the source of truth for the public landing page, because the implementation previously advertised four generic tracks while the academy actually sells eight. Everything transcribed from the crawl now lives in `client/src/data/academyContent.ts`, and the downloaded assets live in `client/public/images/ideveloper`.

What the crawl pinned down:

- **Identity** — phone `01062302368`, working hours 2 PM–7 PM, and the Banha/Omran branch address. These are rendered in the header utility strip and the footer.
- **Catalogue** — the live site advertises eight courses, but the platform only runs four: Scratch, Robotics, Web and Python. The landing page follows the platform, not the live site's marketing list, so it shows the four the academy actually teaches.
  - The counts are not guesswork. They were read out of the curriculum modules: Python 20 sessions over 5 months, Scratch 16 sessions over 4 months, Web 22 sessions over 6 months, Robotics three live tracks over 5 months.
  - `client/src/data/academyContent.test.ts` re-reads those modules and fails if the landing page numbers drift. The counts are written out in `academyContent.ts` rather than computed so the public page does not have to pull three large curriculum files into its bundle.
  - Course marks: Scratch uses the Cloudinary `logoscratch.png` the app already uses, Python uses a tight crop of `curriculum/session1/hero-coding-robot.jpg` (which is the Python logo, despite the filename), and Robotics and Web use the icons from the live site.
- **People** — nine trainers, of whom seven have a published photo. `م/عبد الله هشام` and `م/إيمان خاطر` never had a photo URL resolved, so they render an initials badge rather than borrowing another trainer's picture.
- **Copy** — the hero bullets, the "ماذا تقدم الأكاديمية" offering, the five FAQs, the jobs CTA, and the Codexa developer credit.

Two things the crawl could not resolve, so they are intentionally not fabricated:

- **YouTube promo IDs.** The crawl exposed only the `youtube.com` host, never a video ID. The journey section is therefore a three-tab panel linking out to the channel rather than embedded players.
- **Terms and privacy.** The footer links to the live `terms%26conditions.html` and `privacypolicy.html` instead of local routes, since syncing those pages was out of scope for the landing-page pass.
- **Promo videos.** Resolved on a second pass. The live homepage opens each video in a modal, and its iframes carry the ids directly in `src`, so pairing each `openModalBtnN` with its `videoModalN` recovers both the ids and the order. They play on our own page now — see below.
- **Student photos.** The gallery images are `im1.jpg` … `im20.jpg` inside the live homepage's `image_container` block. Fourteen of them are student photos; `im7`, `im8`, `im9` and `im18` were published lying on their side and had to be turned upright, and `im4`, `im6`, `im13` and `im14` carry the academy's contact strip baked into the bottom edge, which was cropped off. Ten are used, stored under `client/public/images/students`.
- **Phone numbers.** Two different numbers were in play. The live site, the student photos and the footer all show `01062302368`; `contact.ts` carried `01039721472` from earlier. Everything WhatsApp — the rail, the announcement popup's CTA and the new course buttons — now goes to `01062302368`, because the announcement had no number of its own and would otherwise have advertised a line that is not the one printed on the page.
- **Achievement images.** The live site's awards section (`section5`) holds two cards, each with a photo (`6.png`, `7.png`) and a small logo (`8.png`, `9.png`). `6.png` is the Codeavour 2024 collage and `7.png` is the "جائزة الدولة للمبدع الصغير" award graphic. Both achievements in the database were pointing at one shared generic image, so they now point at their own.
  - These are database rows, not code: `academy_achievements.imageUrl` and `.tag` were updated directly. The section heading was also changed to "أحدث إنجازاتنا", which is what the live site calls it.
  - **Cloudinary is not actually configured.** `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are empty strings in `.env`, so `uploadImage()` throws and the admin's own achievement-image upload button cannot work. The images are therefore served from `client/public/images/achievements/` and the rows point at those paths — the column accepts any image URL. Adding the two keys to `.env` (and on the Render dashboard) would let images be uploaded to Cloudinary as originally designed.

## Motion

The landing page motion is hand-rolled rather than pulled from `framer-motion`, which is a dependency but is not imported anywhere in the project — using it would have added real weight to the bundle for one page.

- `client/src/hooks/useInView.ts` — one `IntersectionObserver` per revealed element, disconnected after the element is actually seen.
- `client/src/components/Reveal.tsx` — wrapper that adds `.reveal` and then `.is-revealed`; accepts `delay`/`y`/`x` for staggering.
- `client/src/components/CountUp.tsx` — rAF count-up for the hero stats, eased out and cancelled on unmount.
- `client/src/hooks/useSpotlight.ts` — writes `--spot-x`/`--spot-y` straight to the style attribute so pointer tracking never re-renders.
- The transitions themselves live in `index.css` under a clearly marked motion block.

Two things worth remembering if this is extended:

- **The observer must not disconnect on its first callback.** An `IntersectionObserver` reports every watched element once on observation, and anything below the fold reports "not intersecting". Disconnecting there strands the element at `opacity: 0` permanently — that bug shipped 56 stranded elements until it was caught in verification.
- **Tailwind v4's `dark:` defaults to `prefers-color-scheme`, not a class.** Since `ThemeContext` writes `.dark` on `<html>`, `index.css` now declares `@custom-variant dark (&:where(.dark, .dark *))`. Without it, every `dark:` utility in the project follows the operating system rather than the toggle.

Everything under the motion block is switched off by `prefers-reduced-motion: reduce`, and content falls back to visible whenever `IntersectionObserver` is unavailable.

## Promo videos

Five videos, ids read out of the live homepage's modal iframes and paired with the label of the button that opens each one:

| Label | Video id |
| --- | --- |
| شوف برومو فيديو | `hkd7lFYePnY` |
| تطبيق الطلبة فى محاضرة أوردينو | `xI_2t_Cdlb8` |
| بعض آراء الطلبة و اولياء الأمور | `k5jVwyCm-J4` |
| أعمال بعض الطلبة | `t0WFMl_k374` |
| أعمال بعض الطلبة (2) | `nSquoYpLUFk` |

The live site really does open two different videos from two buttons both labelled "أعمال بعض الطلبة", which is why one tab carries a `(2)` suffix — that exists only to keep the tab strip usable, not because the content differs.

They play **on the page**, not behind a link out. Three details worth keeping if this is touched again:

- Only the active tab's `<iframe>` is mounted. Five players loading at once would cost five times the bandwidth for one visible video.
- The panel is keyed on the tab id, so switching remounts the player and stops the previous video rather than leaving it playing underneath.
- The embed host is `youtube-nocookie.com`. On a page aimed at children that is the better default: no tracking cookie is set until someone actually presses play.
