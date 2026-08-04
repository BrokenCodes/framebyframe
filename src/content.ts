/**
 * All long-form marketing and SEO copy lives here so it can be edited without
 * touching layout. The page has one source language (English); Google page
 * translation makes it readable in any language.
 */

/** Set this to the real deployment origin before shipping — used by canonical, OG and JSON-LD. */
export const SITE_URL = 'https://framebyframe.app'

export const BRAND = {
  name: 'FrameByFrame',
  /** Rendered as FRAME·BY·FRAME with the middle word in the accent colour. */
  wordmark: 'FRAME',
  wordmarkAccent: 'BY',
  wordmarkTail: 'FRAME',
  descriptor: ['STILLS FROM', 'MOVING PICTURES'],
  tagline: 'Extract frames from video in the browser',
}

export const SEO = {
  title: 'FrameByFrame — Extract Frames From Video Online, Free & Private (No Upload)',
  description:
    'Pull full-resolution stills out of any video, free and entirely in your browser. Export every frame or sample by interval as PNG, JPEG or WebP, then download as a ZIP. Nothing is uploaded — your file never leaves your device.',
  keywords: [
    'video frame extractor',
    'extract frames from video',
    'video to images',
    'video to JPG',
    'video to PNG',
    'MP4 to JPG',
    'get still image from video',
    'frame by frame video viewer',
    'extract all frames from MP4',
    'free online frame extractor',
    'no upload video tool',
    'browser video frame grabber',
    'screenshot video frame',
    'export video stills',
  ],
  ogAlt: 'FrameByFrame — a browser-based video frame extractor showing a timeline and extracted stills',
}

export interface NavItem {
  num: string
  label: string
  href: string
}

export const NAV: NavItem[] = [
  { num: '01', label: 'Extractor', href: '#extractor' },
  { num: '02', label: 'How it works', href: '#how-it-works' },
  { num: '03', label: 'Capabilities', href: '#capabilities' },
  { num: '04', label: 'Who uses it', href: '#use-cases' },
  { num: '05', label: 'Formats', href: '#formats' },
  { num: '06', label: 'Privacy', href: '#privacy' },
  { num: '07', label: 'Questions', href: '#faq' },
]

export const HERO = {
  eyebrow: 'FRAME EXTRACTION · IN-BROWSER · EST. 2026',
  /** Split so the middle phrase can render in the accent serif. */
  headline: ['Every frame', 'you need,', 'nothing'],
  headlineAccent: 'uploaded.',
  lede:
    'Drop in a video and pull out full-resolution stills — one frame, a sampled sequence, or all of them. The decode happens on your own machine, so the file never touches a server.',
  disciplines: ['PNG', 'JPEG', 'WEBP', 'ZIP', 'CONTACT SHEET'],
  scroll: 'SCROLL',
}

export const MARQUEE_ITEMS = [
  'FULL-RESOLUTION STILLS',
  'NO UPLOAD, NO ACCOUNT',
  'FRAME-ACCURATE STEPPING',
  'EVERY FRAME OR EVERY NTH SECOND',
  'PNG · JPEG · WEBP',
  'BATCH ZIP EXPORT',
  'RANGE IN / OUT POINTS',
  'WORKS OFFLINE',
  'READABLE IN ANY LANGUAGE',
]

export interface Stat {
  num: string
  value: string
  unit: string
  caption: string
}

export const STATS: Stat[] = [
  { num: '01', value: '0', unit: 'BYTES', caption: 'Uploaded to any server' },
  { num: '02', value: '3', unit: 'FORMATS', caption: 'PNG, JPEG and WebP output' },
  { num: '03', value: '4', unit: 'MODES', caption: 'Ways to sample a timeline' },
  { num: '04', value: '100', unit: '+ LANGUAGES', caption: 'Via Google page translation' },
]

export const MANIFESTO = {
  eyebrow: '01 — THE IDEA',
  headline: ['Made in the open,'],
  headlineAccent: 'run on your desk.',
  body: [
    'Most tools that turn a video into images ask you to hand the video over first. The file goes up, something happens on a machine you cannot see, and a ZIP comes back. For a holiday clip that is merely inconvenient. For an unreleased cut, a medical scan, a client interview or a screen recording of your own dashboard, it is a decision you should not have to make.',
    'FrameByFrame does the work where the file already is. Your browser has a video decoder and a canvas; that is genuinely all frame extraction needs. Load the page once and it keeps working with the network switched off, because there is no server in the loop to talk to.',
  ],
  outLink: 'READ THE METHOD',
}

export interface Step {
  num: string
  title: string
  body: string
}

export const HOW_IT_WORKS = {
  eyebrow: '02 — HOW IT WORKS',
  headline: ['Four steps.'],
  headlineAccent: 'No sign-up.',
  lede: 'From a file on your desktop to a folder of numbered stills, without an account or an upload.',
  steps: [
    {
      num: '01',
      title: 'Load the video',
      body: 'Drag a file anywhere onto the page, browse for it, or paste it from the clipboard. FrameByFrame reads the duration, native dimensions and true frame rate, measuring the rate from real presentation timestamps rather than assuming 30fps.',
    },
    {
      num: '02',
      title: 'Find your range',
      body: 'Scrub the filmstrip timeline, step one frame at a time, and set in and out points to bracket the part you care about. Everything downstream respects that range, so a two-second moment in a two-hour recording costs two seconds of work.',
    },
    {
      num: '03',
      title: 'Choose how to sample',
      body: 'Take one frame every N seconds, sample at a chosen frame rate, spread a fixed number of frames evenly, or capture every single source frame. A live estimate shows the frame count and total size before you commit.',
    },
    {
      num: '04',
      title: 'Export',
      body: 'Frames stream into the gallery as they encode. Keep the ones you want, then download them individually, bundle the selection as a ZIP, or tile them into a single labelled contact sheet.',
    },
  ] satisfies Step[],
}

export interface Capability {
  num: string
  title: string
  body: string
}

export const CAPABILITIES = {
  eyebrow: '03 — CAPABILITIES',
  headline: ['A real editor,'],
  headlineAccent: 'not a file drop.',
  lede:
    'The parts that usually get cut from a free web tool: precision, batching, and knowing what you are about to export.',
  items: [
    {
      num: '01',
      title: 'Frame-accurate navigation',
      body: 'Step forward and back a single frame at a time using the video’s measured rate, with a filmstrip timeline, hover-preview thumbnails and a millisecond timecode readout. Standard rates like 23.976, 29.97 and 59.94 are detected and snapped, so stepping lands where you expect.',
    },
    {
      num: '02',
      title: 'Four sampling modes',
      body: 'Interval, target frame rate, fixed count spread evenly across the range, or every source frame. Interval and count modes seek to exact timestamps; every-frame runs capture during playback instead, avoiding a keyframe hunt on each frame.',
    },
    {
      num: '03',
      title: 'Range in and out points',
      body: 'Draggable, keyboard-adjustable handles on the timeline restrict extraction to a segment. Long recordings stop being all-or-nothing.',
    },
    {
      num: '04',
      title: 'Format and resolution control',
      body: 'PNG for lossless work, JPEG for size, WebP for both — with a quality slider for the lossy formats. Keep the native resolution or cap the longest edge at 1920, 1280 or 640. FrameByFrame never upscales, and the format list is probed against your browser’s real encoder support rather than assumed.',
    },
    {
      num: '05',
      title: 'Batch export that scales',
      body: 'Frames stream in as they encode, with progress and a running estimate. Cancel at any point and everything already extracted is kept. Download the lot as a ZIP, or a subset — shift-click selects ranges.',
    },
    {
      num: '06',
      title: 'Predictable file names',
      body: 'Name by frame number, timecode, or both, zero-padded to the size of the batch so a folder of stills sorts correctly in every file manager.',
    },
    {
      num: '07',
      title: 'Contact sheets',
      body: 'Tile any selection into one labelled JPEG. Useful for choosing a thumbnail, reviewing coverage, or attaching a visual summary to a ticket.',
    },
    {
      num: '08',
      title: 'Built for the keyboard',
      body: 'Play, step, jump, mark in and out, capture, select all and start extraction without leaving the keys. Press ? for the full list.',
    },
  ] satisfies Capability[],
}

export interface UseCase {
  num: string
  title: string
  body: string
}

export const USE_CASES = {
  eyebrow: '04 — WHO USES IT',
  headline: ['Different jobs,'],
  headlineAccent: 'same need.',
  lede: 'A still from a specific moment, at full quality, without a round trip to somebody else’s server.',
  items: [
    {
      num: '01',
      title: 'Editors and motion designers',
      body: 'Pull a reference frame for a match cut, grab a plate for rotoscoping, or export a sequence to check timing outside the NLE.',
    },
    {
      num: '02',
      title: 'Thumbnail selection',
      body: 'Sample a video every second, review the grid, and pick the frame that actually sells the video instead of accepting an auto-generated one.',
    },
    {
      num: '03',
      title: 'Machine learning datasets',
      body: 'Turn footage into training images at a controlled sample rate and a fixed longest edge, named in a stable order — without pushing source video into a third-party pipeline.',
    },
    {
      num: '04',
      title: 'Sports and movement analysis',
      body: 'Step through a technique frame by frame at the real capture rate, and export the sequence that shows the moment of contact.',
    },
    {
      num: '05',
      title: 'QA and bug reports',
      body: 'Extract the exact frames where a screen recording goes wrong, then attach a contact sheet so the whole regression is visible at a glance.',
    },
    {
      num: '06',
      title: 'Research and sensitive footage',
      body: 'Interviews, clinical recordings and legal material can be processed without leaving the device, which keeps the handling story simple.',
    },
  ] satisfies UseCase[],
}

export interface FormatRow {
  format: string
  container: string
  notes: string
}

export const FORMATS = {
  eyebrow: '05 — FORMATS',
  headline: ['If your browser'],
  headlineAccent: 'plays it, we read it.',
  lede:
    'FrameByFrame decodes with the same engine that plays video on the rest of the web, so support follows your browser rather than a server-side converter.',
  inputTitle: 'Input',
  inputRows: [
    { format: 'MP4 / M4V', container: 'H.264, HEVC*, AV1*', notes: 'Broadest support; the safest bet everywhere' },
    { format: 'WebM', container: 'VP8, VP9, AV1', notes: 'Fully supported in Chrome, Firefox and Edge' },
    { format: 'MOV', container: 'H.264, HEVC*', notes: 'Reliable in Safari; usually fine in Chrome' },
    { format: 'MKV', container: 'Varies', notes: 'Depends on the codec inside the container' },
    { format: 'AVI / MPG', container: 'Legacy', notes: 'Older codecs may not decode — convert first if so' },
  ] satisfies FormatRow[],
  inputNote:
    '* HEVC and AV1 depend on your operating system and hardware. If a file will not open, it means the browser cannot decode it; converting to MP4 (H.264) or WebM resolves it.',
  outputTitle: 'Output',
  outputRows: [
    { format: 'PNG', container: 'Lossless', notes: 'Largest files; correct choice for archival and compositing' },
    { format: 'JPEG', container: 'Lossy, adjustable', notes: 'Best size-to-quality balance for review and datasets' },
    { format: 'WebP', container: 'Lossy, adjustable', notes: 'Roughly 25–35% smaller than JPEG at similar quality' },
    { format: 'ZIP', container: 'Bundle', notes: 'Stored, not re-compressed — fast, since images are already compressed' },
    { format: 'JPEG sheet', container: 'Contact sheet', notes: 'One tiled, timecode-labelled overview image' },
  ] satisfies FormatRow[],
}

export const PRIVACY = {
  eyebrow: '06 — PRIVACY',
  headline: ['The file stays'],
  headlineAccent: 'on your machine.',
  points: [
    {
      num: '01',
      title: 'No upload step',
      body: 'Your video is read through a local object URL and decoded by the browser. There is no request that carries it anywhere, because there is no backend to receive it.',
    },
    {
      num: '02',
      title: 'No account, no queue',
      body: 'Nothing to sign up for, no credits, no watermark, and no waiting behind other people’s jobs. Speed depends on your own machine.',
    },
    {
      num: '03',
      title: 'Extraction works offline',
      body: 'Once the page has loaded, extraction itself needs no network at all. Disconnect and it keeps working — the plainest possible proof that your video is not being sent anywhere.',
    },
    {
      num: '04',
      title: 'Nothing retained',
      body: 'Frames live in memory for the session. Close the tab and they are gone; only what you explicitly downloaded remains on disk.',
    },
    {
      num: '05',
      title: 'What we do measure',
      body: 'The page can load Google Analytics for aggregate visit statistics, and Google’s translation widget once you pick a language. Both set cookies and see your IP address, and translation sends the page’s visible text — never your video, and never any extracted frame — to Google. In the EEA, UK, Switzerland and other prior-consent countries nothing loads until you accept; elsewhere you get a notice and a one-click opt-out. Global Privacy Control and Do Not Track are honoured everywhere. Change your mind any time via Privacy choices in the footer.',
    },
  ],
}

export interface Faq {
  q: string
  a: string
}

/** Also emitted as FAQPage JSON-LD — keep answers self-contained and factual. */
export const FAQ = {
  eyebrow: '07 — QUESTIONS',
  headline: ['Answers before'],
  headlineAccent: 'you need them.',
  items: [
    {
      q: 'Is FrameByFrame really free, and is there a watermark?',
      a: 'Yes, it is free, and there is no watermark, no export cap and no account. Frames come out at the resolution and quality you choose, with nothing added to the image.',
    },
    {
      q: 'Does my video get uploaded anywhere?',
      a: 'No. The video is decoded by your own browser and drawn to a canvas locally. There is no server component that receives video, which is why the tool continues to work with your network disconnected.',
    },
    {
      q: 'How do I extract every single frame from a video?',
      a: 'Load the video, choose the "Every frame" sampling mode, and start extraction. FrameByFrame plays the video and captures each presented frame using its real presentation timestamp, which is far faster than seeking once per frame. Bear in mind that a one-minute clip at 60fps is 3,600 images, so it is usually worth setting in and out points first.',
    },
    {
      q: 'What is the best format — PNG, JPEG or WebP?',
      a: 'Choose PNG when the frames feed into compositing or archiving and you cannot accept compression artefacts. Choose JPEG for review, contact sheets and most datasets, since it gives the best size-to-quality balance. Choose WebP when you want JPEG-like quality about 25–35% smaller and you know your downstream tools read it.',
    },
    {
      q: 'Will the extracted frames match the original quality?',
      a: 'Frames are drawn at the video’s native resolution by default, so there is no scaling loss. Beyond that, quality depends on your output choice: PNG is lossless, while JPEG and WebP re-encode at the quality you set. The decoded frame itself is exactly what the browser plays.',
    },
    {
      q: 'Why does the frame rate show as "estimated"?',
      a: 'FrameByFrame measures the true frame rate from real video frame callbacks and snaps the result to the nearest standard rate. In browsers without that API it falls back to 30fps and labels the value estimated, which only affects single-frame stepping and every-frame runs — interval, rate and count sampling are unaffected.',
    },
    {
      q: 'What is the largest video I can use?',
      a: 'There is no fixed limit, because the file is never transferred. Practically, the ceiling is your device’s memory and how many frames you extract at once. Very long recordings are best handled by setting in and out points, or by sampling at an interval rather than capturing every frame.',
    },
    {
      q: 'My file will not open. What now?',
      a: 'That means your browser cannot decode that particular codec, not that the file is broken. It is most common with HEVC, older AVI codecs and some MKV contents. Converting the file to MP4 (H.264) or WebM fixes it, as does trying a different browser — Safari and Chrome support different codec sets.',
    },
    {
      q: 'Can I extract frames from a YouTube or streaming URL?',
      a: 'No. FrameByFrame works on video files you already have on your device. It does not download from streaming services, which would breach their terms and, for most content, copyright.',
    },
    {
      q: 'Does it work on a phone or tablet?',
      a: 'Yes. The interface adapts to small screens and works with touch, including the timeline range handles. Extraction speed and how many frames you can hold at once are more limited on mobile hardware than on a desktop.',
    },
    {
      q: 'How are the exported files named?',
      a: 'You choose: frame number, timecode, or both, prefixed with the source file name. Numbers are zero-padded to the size of the batch, so the stills sort correctly in any file manager.',
    },
    {
      q: 'Can I get one image instead of a batch?',
      a: 'Yes. Scrub to the moment you want, step to the exact frame, and use Capture this frame — or press C. It lands in the gallery for download on its own, with no extraction run needed.',
    },
  ] satisfies Faq[],
}

export const CTA = {
  headline: ['Drop a video in.'],
  headlineAccent: 'It stays yours.',
  body: 'No upload, no account, no watermark. Frame extraction keeps working with the network switched off.',
  button: 'OPEN THE EXTRACTOR',
}

export const FOOTER = {
  blurb:
    'FrameByFrame is a free, browser-based video frame extractor. Video decoding and image encoding happen entirely on your device — no file is ever transmitted.',
  columns: [
    {
      title: 'Tool',
      links: [
        { label: 'Frame extractor', href: '#extractor' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Capabilities', href: '#capabilities' },
        { label: 'Supported formats', href: '#formats' },
      ],
    },
    {
      title: 'Tasks',
      links: [
        { label: 'Video to JPG', href: '#extractor' },
        { label: 'Video to PNG', href: '#extractor' },
        { label: 'Extract all frames', href: '#faq' },
        { label: 'Make a contact sheet', href: '#capabilities' },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'Privacy model', href: '#privacy' },
        { label: 'Questions', href: '#faq' },
        { label: 'Keyboard shortcuts', href: '#shortcuts' },
        { label: 'Privacy choices', href: '#privacy-choices' },
        { label: 'Who uses it', href: '#use-cases' },
      ],
    },
  ],
  legal: 'Your video is processed in your browser and never uploaded. No accounts. This site uses Google Analytics.',
}
