# FrameByFrame

A free, browser-based video frame extractor. Video decoding and image encoding
happen entirely on the device — no file is ever transmitted.

Functionally a rebuild of the frame-extractor.com feature set, with a much larger
editor and a content-rich, SEO-oriented landing page. All code, copy and assets
are original.

```bash
npm install
npm run dev        # dev server
npm run build      # production build to dist/
npm run typecheck
```

## Before deploying

Set the real origin in two places — everything else is derived from them:

- `SITE_URL` in [src/content.ts](src/content.ts)
- the `framebyframe.app` occurrences in [index.html](index.html),
  [public/sitemap.xml](public/sitemap.xml) and [public/robots.txt](public/robots.txt)

Also add an `og.png` (1200×630) to `public/` — the social tags reference it but the
image itself is not included.

## Design

Editorial-industrial: sharp corners throughout, hairline rules as the primary
structural device, alternating bone (`#f2f0ec`) and near-black (`#0b0b0d`) bands,
and a single crimson accent (`#c2202f`). Headlines are a tight-leading grotesk with
a red italic serif phrase as the recurring accent. Sections are numbered `01 —`,
stats use oversized numerals with small accent units, and a marquee ticker sits
under the hero.

## Theming

Two independent axes:

1. **Theme** — `light` / `dark`, set by the `.dark` class on `<html>`.
2. **Band** — default or `.band-alt`, a *within-theme* surface alternation that
   gives the layout its editorial rhythm. Bands never fight the theme: light theme
   alternates bone `#f2f0ec` and white, dark theme alternates `#0b0b0d` and
   `#131318`.

Every component reads the same tokens — `--paper` (section surface), `--paper-2`
(raised card), `--paper-3` (sunken well), and `--ink` / `--ink-2` / `--ink-3` for
text — so adding a band or flipping the theme needs no component change.

**Mode is three-way**: Light, Dark, or System. `System` is a real, persisted
choice, not just the initial default, so a user who has toggled manually can hand
control back to the OS — and while on `System` the app follows live
`prefers-color-scheme` changes without a reload.

An inline bootstrap in `index.html` applies the stored theme **before first paint**,
so there is no flash of the wrong theme while React boots. It must produce the same
result as `applyTheme()` in [src/lib/theme.ts](src/lib/theme.ts) — keep the two in
sync. Switching also updates `<meta name="theme-color">` and `color-scheme`, so
browser chrome and native form controls follow.

Two deliberate exceptions to theme inversion, both documented in the CSS:

- **Media surfaces** (video well, frame thumbnails) stay neutral dark in *both*
  themes. You judge an extracted frame against a dark ground; a cream backdrop
  skews perceived exposure. Overlays on those surfaces are correspondingly fixed.
- **Two accent tokens.** `--accent` is the brand crimson for *fills* (buttons,
  bars, handles), where `--accent-ink` provides contrast on top. `--accent-text` is
  the same hue retuned per theme for use *as text*, so small accent labels clear
  WCAG AA. Using one accent for both is what previously pushed several labels
  under 4.5:1.

## Translation

**Google page translation is the only translation mechanism.** The page has a single
source language (English) and the widget — mounted once in the header, see
[src/components/GoogleTranslate.tsx](src/components/GoogleTranslate.tsx) — makes the
whole thing readable in any of ~249 languages, chrome and long-form body copy alike.

The earlier in-app 13-locale switcher has been removed, along with its dictionaries,
`detectLocale`, the RTL handling and the per-locale `hreflang`/sitemap entries (which
pointed at routes that were never served). `src/i18n.ts` is now just the English
string table behind `t()`, so components did not have to change. Two competing
translation layers produced mixed-language pages, which is why only one remains.

Removing the 12 dictionaries also cut ~37 KB from the bundle.

The product name is never translated. `protectBrand()` in
[src/lib/brand.tsx](src/lib/brand.tsx) splits body copy around "FrameByFrame" and
wraps each occurrence in `notranslate` + `translate="no"`, so other browsers'
translators respect it too.

One subtlety worth keeping: Google translates the fragments on either side of a
protected span independently **and trims them**, which collapsed the surrounding
spaces (`"EsFrameByFrame¿Es realmente…"`). `protectBrand` therefore carries the
adjoining spaces *inside* the protected span, where Google leaves them alone.

Three gotchas if you touch the widget CSS:

- Its rules must stay **outside `@layer`**. Google's stylesheet is unlayered, and
  unlayered CSS beats layered CSS regardless of specificity.
- Pass no `layout` option, so the widget renders a plain `<select>` we can restyle.
  `InlineLayout.SIMPLE` renders Google's own overlay menu instead, which cannot be
  made to fit the design.
- Google injects a "Translator" anchor to translate.google.com with
  `target="_blank"`, plus a hover tooltip that also carries outbound links. Both are
  hidden. Match on `#google_translate_element a`, not on a class — the anchor's class
  is obfuscated and it sits *inside* the select's wrapper, so a `:not(:first-child)`
  rule misses it.

This is Google's legacy Website Translator element — functional, but no longer an
actively supported product. It is wired as a progressive enhancement: if it fails
to load the component renders nothing and the page stays fully usable.

## Analytics

GA4 (`G-Z6VDR9K266`) is in `<head>` in [index.html](index.html). Since this is a
single-page app served from one HTML shell, that covers every route and section —
there is no per-page snippet to add.

**This changed what the site can honestly claim.** The footer previously asserted
"no tracking" in all 13 languages, and the privacy section implied the whole page
worked offline. Both were made false by adding GA and the translate widget, so the
copy was corrected: a new privacy point (`05 — What we do measure`) states plainly
that both set cookies, see the visitor's IP, and that translation sends visible
page text to Google — while the load-bearing claim stays true and unchanged: the
video and every extracted frame remain local and are never transmitted.

## Consent

Implemented with **Google Consent Mode v2**. The defaults are declared in an inline
script in `index.html` that runs **before `gtag.js`**, which is the part that
actually matters: nothing can be stored or sent before a lawful basis exists.

Two defaults are pushed:

1. **Region-scoped deny** for the EEA-27, UK, Switzerland, Norway, Iceland,
   Liechtenstein, plus Brazil, South Korea and Thailand — with `wait_for_update`.
   Google enforces this against the visitor's real IP, which is far more reliable
   than any client-side guess.
2. **Global default** for everywhere else: `analytics_storage` granted,
   all advertising signals denied (this site serves no ads, so they are never
   granted under any circumstance).

### Three regimes

[src/lib/consent.ts](src/lib/consent.ts) picks how consent is *asked for*:

| Regime | Where | Behaviour |
| --- | --- | --- |
| `opt-in` | EEA/UK/CH, BR, KR, TH, or unknown | Blocking modal. Nothing granted until an affirmative choice. Accept and Reject carry equal visual weight, and Escape cannot bypass it. |
| `opt-out` | US, Canada | Non-blocking bar with an explicit opt-out control. |
| `notice` | Rest of world | Non-blocking disclosure with the same one-click opt-out. |

Region is inferred from the IANA timezone, deliberately **without a network call** —
an IP geolocation lookup would itself transmit the visitor's address before they had
consented. It is therefore coarse and **fails safe**: an unreadable timezone, or
anything Europe-adjacent, is treated as `opt-in`. A wrong guess changes only which
banner is shown, never whether Google may measure an EEA visitor — the region-scoped
default already covers that.

**Global Privacy Control and Do Not Track** are honoured everywhere, not only where
legally binding, and force the `opt-in` path.

### Withdrawal and record-keeping

"Privacy choices" in the footer reopens the banner at any time, so withdrawing is as
easy as granting — a GDPR requirement. Declining also **deletes GA's `_ga*`
cookies**: Consent Mode stops collection on its own, but leaving them behind after a
refusal reads like the refusal did nothing. Each decision is stored with an ISO
timestamp, the regime it was made under, and a `CONSENT_VERSION` — bump that constant
when the categories change and every visitor is asked again.

### The translate widget

Google's translation script now loads **on click, not on page load**. Translating
transmits the page's visible text and the visitor's IP to Google, so under
prior-consent law it should not happen unprompted; clicking *is* the request. It also
keeps a third-party script off the critical path for the majority who never change
language.

### What is still on you

The consent record lives in `localStorage`, which is per-device and per-browser —
adequate for a static site with no accounts, but it is not a server-side consent log.
If you later need an auditable central record, that needs a backend.

## Page structure

Hero with the extractor built into it → marquee → stat band → the idea → how it
works (4 steps) → capabilities (8) → who uses it (6) → formats (input/output
tables) → privacy (5) → FAQ (12) → full-bleed CTA → footer.

The marketing content stays mounted while the studio is open, so the page keeps its
crawlable body copy in every state.

## SEO / SMO

- Descriptive title and meta description, keyword meta, canonical, robots directives
- Open Graph and Twitter card tags with image alt text
- `robots.txt`, a single-URL `sitemap.xml`, and a web app manifest
- `theme-color` kept in sync with the active theme at runtime
- JSON-LD `@graph`: `WebApplication`, `WebSite`, `Organization`, `HowTo` (4 steps),
  `FAQPage` (12 Q&A, kept in sync with the rendered FAQ), `BreadcrumbList`
- One `h1`, ordered `h2`/`h3` beneath it, real `<table>` markup for the format
  matrices, `<dl>` for the FAQ, and labelled landmarks

## Tool features

**Input** — drag and drop anywhere, file browse, or clipboard paste. Any format the
browser can decode. On load FrameByFrame probes duration, native dimensions and frame
rate, *measuring* the rate from real presentation timestamps via
`requestVideoFrameCallback` and snapping to the nearest standard rate (23.976,
29.97, 59.94…). Without that API it falls back to 30 and labels the value estimated.

**Editor** — filmstrip timeline built from generated thumbnails that fill in
progressively, scrub-to-seek with hover preview and timecode, draggable
keyboard-adjustable in/out handles, frame-accurate stepping, one-second jumps, and
single-frame capture at the playhead.

**Sampling** — every N seconds; a target fps; a fixed count spread evenly with both
endpoints included; or every source frame.

**Output** — PNG, JPEG or WebP with a quality slider, probed against the browser's
real encoder support. Native resolution or a longest-edge cap (1920/1280/640),
never upscaling. Filename templates (number, timecode, or both) zero-padded to the
batch size. ZIP of all or a selection, stored rather than deflated. Contact sheet
tiling any selection into one labelled JPEG. Per-frame download, copy to clipboard,
or jump the playhead to a frame's time.

**Interface** — live frame-count and size estimate refined from bytes actually
produced; streaming results with progress and ETA; cancellable runs that keep what
was already extracted; shift-click range selection; three thumbnail densities;
light/dark themes; readable in any language via Google page translation;
keyboard shortcuts throughout (`?`).

## Notes on the two extraction paths

Seeking once per frame is accurate but slow, because each seek may force the
decoder back to a keyframe. For every-frame runs the video is played instead and
each presented frame is captured through `requestVideoFrameCallback`, using
`mediaTime` for exact timestamps and skipping re-presented duplicates. Interval,
fps and count modes use precise seeking, since they need specific timestamps rather
than every frame.

Object URLs for extracted frames are revoked when frames are removed, cleared,
replaced, or the app unmounts, so long sessions don't accumulate blobs.

## Verified

Typecheck and production build clean; `robots.txt`, `sitemap.xml` and the manifest
all emit to `dist/`.

Checked in-browser: every section renders, all internal anchors resolve, the JSON-LD
`@graph` parses with all six types, the FAQ schema count matches the rendered FAQ
(12/12), the accordion toggles `aria-expanded` and panel visibility, both format
tables render, and there is no horizontal page overflow at desktop or 390px.

**Theming** — all three modes drive `.dark`, `data-theme`, `color-scheme`,
`theme-color` and storage in lockstep. Flipping the browser's real
`prefers-color-scheme` moves the app while `mode` stays `system`, and an explicit
Light/Dark choice is *not* overridden by a later OS change. The pre-paint bootstrap
was confirmed synchronous in `<head>` ahead of both the stylesheet and the app
module. In light theme the studio chrome resolves white while the video well stays
`#0b0b0d`, as intended.

**Consent** — verified in an isolated iframe so no stray interaction could
contaminate the result. With no stored decision: both defaults are pushed before GA
configures, the region-scoped one denies all six signals across 35 territories, and
**zero consent updates fire before a choice**. Forcing the `opt-in` regime produced a
modal with a scrim, `aria-modal="true"`, equal-prominence Accept/Reject, no Close,
and Escape correctly failed to dismiss it. Reject pushed a denied update, stored
`analytics: false` with a timestamp, and cleared the `_ga*` cookies; Accept pushed a
granted update. The footer control reopens the banner and reports the current state.
All 19 timezone→regime cases pass (Berlin/Dublin/London/Zurich/Reykjavik/Nicosia/
São Paulo/Seoul/Bangkok → opt-in; New York/LA/Toronto → opt-out; Kathmandu/Tokyo/
Sydney/Lagos/Kolkata → notice; unreadable → opt-in) and GPC forces opt-in.

**Translation & analytics** — GA4 verified live: `dataLayer` populated, `gtag`
defined, tag script present, and `config` carrying `G-Z6VDR9K266`; the id appears
twice in the built `dist/index.html`. The translate widget renders a single
container with 249 languages, Google's branding and outbound links suppressed, and
no displacement of the sticky header. It persists across the landing and studio
views with no duplicate container, and no `target="_blank"` link is visible anywhere
on the page before or after translating. Translating to Spanish end to end rewrote the title, hero,
steps, capabilities, use cases, privacy, FAQ and footer, while all 12
brand-protected nodes stayed exactly "FrameByFrame" and no jammed spacing remained.

**Contrast** — an automated sweep of *every* text-bearing element (all FAQ panels
open) against its resolved background reports **0 failures** in both themes, using
WCAG AA thresholds with the correct large-text rule (≥24px, or ≥18.66px when bold).
That sweep is what caught the original `--ink-3` at 4.44:1 on bone and accent text
at 4.37:1 on dark; both are fixed.

End to end on a generated 25fps clip: 4 frames at exact 1s boundaries, all
auto-selected, a ZIP with a valid `PK` signature and four correctly named non-empty
entries, and a 40 KB contact-sheet JPEG. Earlier runs also validated the sampling
math (interval, fps, count endpoints, every-frame, sub-ranges, zero-span, reversed
range), scaling, timecode formatting, and filename templates, plus metadata probing
against a 1.2 GB, 13:56, 59.94fps portrait recording.
