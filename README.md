# FrameByFrame

A free, browser-based video frame extractor. Video decoding and image encoding
happen entirely on the device — no file is ever transmitted.

**Plain HTML, CSS and JavaScript. No build step, no dependencies, no `node_modules`.**
Upload the files to any static host and it runs.

## Running it

There is nothing to install or compile. Serve the directory with anything:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. It must be *served*, not opened as a `file://`
path — ES modules require an HTTP origin.

## Deploying

Copy these to your web root:

```
index.html
styles.css
js/
manifest.webmanifest
robots.txt
sitemap.xml
```

Requirements on the host: correct MIME types (`.js` as `application/javascript`,
`.webmanifest` as `application/manifest+json`) and **HTTPS** — the clipboard copy
feature, Google Analytics and Google Translate all expect a secure origin.

No SPA rewrite rules are needed. Navigation is hash anchors on a single page, so
there are no deep routes to configure.

### Before going live

- Replace `framebyframe.app` in `index.html`, `sitemap.xml` and `robots.txt` with
  your real origin (canonical, Open Graph and JSON-LD all reference it).
- Add an `og.png` (1200×630) — the social tags point at it but the image is not
  included.

## Structure

| File | Role |
| --- | --- |
| `index.html` | All content as real markup, plus SEO head, JSON-LD, icon sprite, and the theme + consent bootstraps |
| `styles.css` | Whole design system and layout |
| `js/main.js` | Bootstrap — wires page chrome, delegates the tool to `studio.js` |
| `js/studio.js` | The extractor: player, timeline, settings, gallery |
| `js/extract.js` | Sampling plan, scaling, the two capture paths |
| `js/video.js` | Metadata probe, precise seeking, frame-rate measurement |
| `js/zip.js` | Store-only ZIP writer (see below) |
| `js/download.js` | Filenames, single-frame save, clipboard, ZIP, contact sheet |
| `js/format.js` | Timecode/byte formatting, encoder capability probing |
| `js/theme.js` | Three-way theme control |
| `js/consent.js` | Consent regimes and Consent Mode updates |
| `js/translate.js` | Click-to-load Google page translation |

Content lives in the HTML rather than a JS data structure. That is a deliberate
trade: adding an FAQ entry means editing markup, but the copy is crawlable with
JavaScript disabled, which the previous client-rendered build was not.

## Notes on the interesting parts

**Two capture paths.** Seeking once per frame is accurate but slow, because each
seek may force the decoder back to a keyframe. For every-frame runs the video is
played instead and each presented frame is captured through
`requestVideoFrameCallback`, using `mediaTime` for exact timestamps and skipping
re-presented duplicates. Interval, fps and count modes use precise seeking, since
they need specific timestamps rather than every frame.

**Measured frame rate.** The rate is measured from real presentation timestamps
and snapped to the nearest standard rate (23.976, 29.97, 59.94…), using a median
delta so dropped frames don't skew it. Without that API it falls back to 30 and
labels the value estimated.

**ZIP without a library.** `js/zip.js` writes a standard archive in ~100 lines.
Entries are *stored*, not deflated — not a limitation but the correct choice, since
PNG/JPEG/WebP are already compressed, so deflating costs CPU for ~0% gain. This is
what removed the project's last runtime dependency.

**Rendering discipline.** State lives in one object in `studio.js`; each mutation
calls the narrowest render function that covers it. Selection is a class flip, not
a gallery rebuild, and extraction appends one frame at a time rather than
re-rendering the grid per frame.

**`min-width: 0` in the stylesheet is load-bearing.** Grid and flex items default
to `min-width: auto` and refuse to shrink below their content's min-content width.
Without those declarations the 34rem format tables widen the whole page on a phone
instead of scrolling inside their own container.

## Theming

Two axes: **theme** (`light` / `dark`, via the `dark` class on `<html>`) and **band**
(default / `.band-alt`, a *within-theme* surface alternation for rhythm). Bands
never fight the theme — light alternates bone and white, dark alternates two
near-blacks. Every component reads the same tokens (`--paper`, `--paper-2`,
`--paper-3`, `--ink`/`--ink-2`/`--ink-3`).

Mode is three-way: Light, Dark, **System** — a real persisted choice, so someone who
toggled manually can hand control back to the OS, and while on System the page
follows live `prefers-color-scheme` changes. An inline bootstrap applies the stored
theme before first paint, so there is no flash; it must stay in sync with
`applyTheme()` in `js/theme.js`.

Two deliberate exceptions, both commented in the CSS:

- **Media surfaces** (video well, frame thumbnails) stay neutral dark in *both*
  themes — you judge a frame against a dark ground, and cream would skew perceived
  exposure.
- **Two accent tokens.** `--accent` is the brand crimson for fills;
  `--accent-text` is the same hue retuned per theme for use as text, so small
  accent labels clear WCAG AA. One token for both is what previously pushed several
  labels under 4.5:1.

## Translation

Google page translation is the only translation mechanism — one source language
(English), readable in ~249 languages including the long-form body copy.

It loads **on click, not on page load**: translating transmits the page's visible
text and the visitor's IP to Google, so under prior-consent law it should not happen
unprompted, and clicking *is* the request.

The product name is never translated — every occurrence carries `notranslate` and
`translate="no"`.

Three gotchas if you touch the widget CSS:

- Its rules must stay **outside any `@layer`** (moot here, but relevant if you add
  layers): Google's stylesheet is unlayered and unlayered CSS beats layered CSS.
- Pass no `layout` option, so it renders a plain `<select>` that can be restyled.
  `InlineLayout.SIMPLE` renders Google's own overlay menu, which cannot.
- Google injects a "Translator" anchor with `target="_blank"` plus a hover tooltip
  carrying outbound links. Both are hidden via `#google_translate_element a` — match
  the element, not a class: the class is obfuscated and it sits *inside* the
  select's wrapper.

## Analytics and consent

GA4 (`G-Z6VDR9K266`) is in `<head>`. One HTML shell means it covers every section —
there is no per-page snippet to add.

Consent uses **Google Consent Mode v2**, declared inline **before `gtag.js`** so
nothing is stored or sent before a lawful basis exists. Two defaults are pushed:
a **region-scoped deny** for the EEA-27, UK, Switzerland, Norway, Iceland,
Liechtenstein, Brazil, South Korea and Thailand (Google enforces this against the
real IP), and a global default elsewhere with analytics on and all advertising
signals off — those are never granted.

| Regime | Where | Behaviour |
| --- | --- | --- |
| `opt-in` | EEA/UK/CH, BR, KR, TH, or unknown | Blocking modal; nothing granted until an affirmative choice. Accept and Reject have equal weight; Escape cannot bypass it. |
| `opt-out` | US, Canada | Non-blocking bar with an explicit opt-out. |
| `notice` | Rest of world | Non-blocking disclosure with the same one-click opt-out. |

Region comes from the IANA timezone — deliberately **no network call**, since an IP
lookup would itself transmit the visitor's address pre-consent. It is coarse and
**fails safe**: unreadable or Europe-adjacent means `opt-in`. GPC and Do Not Track
are honoured everywhere.

"Privacy choices" in the footer reopens the banner, so withdrawal is as easy as
granting. Declining also deletes GA's `_ga*` cookies. Decisions store an ISO
timestamp, the regime, and `CONSENT_VERSION` — bump that to re-ask everyone.

**Still on you:** the consent record is in `localStorage`, so it is per-device and
not a server-side audit log. If a DPA ever wants central proof of consent, that
needs a backend.

## Verified

Served with `python3 -m http.server` — no Node involved — with no console errors.

- **Structure:** one `h1`, 10 sections, 12 FAQ items, both format tables, JSON-LD
  `@graph` parsing with all six types, 13 brand-protected nodes, GA configured with
  the right ID, both consent defaults pushed before GA, and the translate script
  correctly *not* loaded until clicked.
- **Extraction:** frames land on exact 1s boundaries; the studio header and settings
  sidebar render; the hero copy steps aside for the workbench.
- **ZIP:** round-tripped by an independent reader that walks the central directory
  (a different code path from the writer) — correct entry count and names, every
  entry carrying valid JPEG magic bytes, and the first entry decoding at its true
  dimensions.
- **Contrast:** an automated sweep of every text-bearing element against its
  resolved background, with all FAQ panels open, reports **0 failures in both
  themes** using WCAG AA thresholds and the correct large-text rule.
- **Responsive:** **no page overflow at 320, 390, 768, 1280 or 1600px**, measured in
  real fixed-width iframes rather than device emulation. Wide tables scroll inside
  their own container only where needed.
