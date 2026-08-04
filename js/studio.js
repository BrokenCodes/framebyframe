import { Cancelled, extract, outputSize, planTimestamps } from './extract.js'
import { bytes, supportedFormats, timecode } from './format.js'
import { probe, seekTo } from './video.js'
import { copyFrame, saveContactSheet, saveFrame, saveZip } from './download.js'

/**
 * The extractor workbench.
 *
 * Replaces the React component tree with explicit DOM updates. State lives in
 * one `state` object; each mutation calls the narrowest render function that
 * covers it, so the frame gallery is never rebuilt for a slider move.
 */

const DEFAULTS = {
  mode: 'interval',
  interval: 1,
  sampleFps: 2,
  count: 24,
  start: 0,
  end: 0,
  format: 'jpeg',
  quality: 0.92,
  maxEdge: 0,
  sourceFps: 30,
}

const MODE_LABELS = {
  interval: 'Every N seconds',
  fps: 'Frames per second',
  count: 'Fixed number',
  every: 'Every frame',
}

const EDGE_PRESETS = [0, 1920, 1280, 640]
const NAME_LABELS = { index: 'Frame number', timecode: 'Timecode', both: 'Number + timecode' }

const icon = (name, cls = 'ico') =>
  `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}" /></svg>`

export function createStudio({ mount, dropzoneMarkup, onPhaseChange }) {
  /** @type {any} */
  const state = {
    phase: 'idle', // idle | loading | ready | error
    file: null,
    src: '',
    meta: null,
    thumbs: [],
    current: 0,
    playing: false,
    muted: true,
    options: { ...DEFAULTS },
    naming: 'both',
    frames: [],
    selected: new Set(),
    gridSize: 'md',
    progress: null,
    zipping: false,
    handle: null,
    lastToggled: null,
    errorMessage: '',
  }

  const formats = supportedFormats()
  let els = {}

  /* ------------------------------------------------------------------ utils */

  const revokeFrames = () => {
    state.frames.forEach((f) => URL.revokeObjectURL(f.url))
    state.frames = []
    state.selected = new Set()
  }

  const selectedFrames = () => state.frames.filter((f) => state.selected.has(f.id))

  const measuredBytesPerFrame = () =>
    state.frames.length
      ? state.frames.reduce((sum, f) => sum + f.blob.size, 0) / state.frames.length
      : null

  /* ------------------------------------------------------------- file input */

  async function openFile(file) {
    state.handle?.cancel()
    state.progress = null
    state.phase = 'loading'
    revokeFrames()
    state.thumbs = []
    render()

    if (state.src) URL.revokeObjectURL(state.src)
    state.src = URL.createObjectURL(file)
    state.file = file

    const probeEl = document.createElement('video')
    probeEl.src = state.src
    probeEl.muted = true
    probeEl.playsInline = true
    probeEl.preload = 'auto'

    try {
      const meta = await probe(probeEl)
      state.meta = meta
      state.options = {
        ...state.options,
        start: 0,
        end: meta.duration,
        sourceFps: meta.fps,
        sampleFps: Math.min(state.options.sampleFps, Math.max(1, Math.round(meta.fps))),
      }
      state.current = 0
      state.phase = 'ready'
      render()
      buildThumbs(state.src, meta)
      window.scrollTo({ top: 0, behavior: 'auto' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      state.errorMessage =
        msg === 'no-video-track'
          ? 'This file has no video track.'
          : msg === 'decode-failed'
            ? 'Your browser can’t decode this file. Try MP4 (H.264) or WebM, or convert the file first.'
            : 'Something went wrong while reading the file.'
      state.phase = 'error'
      render()
    } finally {
      probeEl.removeAttribute('src')
      probeEl.load()
    }
  }

  function reset() {
    state.handle?.cancel()
    state.progress = null
    state.phase = 'idle'
    state.file = null
    state.meta = null
    state.thumbs = []
    if (state.src) URL.revokeObjectURL(state.src)
    state.src = ''
    revokeFrames()
    state.options = { ...DEFAULTS }
    render()
  }

  /**
   * Low-res filmstrip for the timeline. Best-effort: a failure here only costs
   * the strip, not the app.
   */
  async function buildThumbs(url, meta, count = 16) {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const height = 72
    const width = Math.max(2, Math.round((meta.width / meta.height) * height))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    try {
      await new Promise((resolve, reject) => {
        video.addEventListener('loadeddata', () => resolve(), { once: true })
        video.addEventListener('error', () => reject(new Error('decode-failed')), { once: true })
      })

      const out = []
      for (let i = 0; i < count; i++) {
        if (state.src !== url) return // a different file was loaded meanwhile
        await seekTo(video, ((i + 0.5) / count) * meta.duration)
        ctx.drawImage(video, 0, 0, width, height)
        out.push(canvas.toDataURL('image/jpeg', 0.6))
        state.thumbs = [...out]
        renderStrip()
      }
    } catch {
      /* filmstrip is optional */
    } finally {
      video.removeAttribute('src')
      video.load()
    }
  }

  /* ------------------------------------------------------------- playback */

  const video = () => els.video

  function seek(time) {
    const v = video()
    if (!v || !Number.isFinite(v.duration)) return
    const clamped = Math.min(Math.max(time, 0), v.duration)
    v.currentTime = clamped
    state.current = clamped
    renderTimeline()
  }

  function togglePlay() {
    const v = video()
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  function stepFrame(delta) {
    const v = video()
    if (!v || !state.meta) return
    v.pause()
    seek(v.currentTime + delta / state.meta.fps)
  }

  function setRange(start, end) {
    state.options.start = start
    state.options.end = end
    renderTimeline()
    renderEstimate()
  }

  /* --------------------------------------------------------- single capture */

  async function captureCurrent() {
    const v = video()
    if (!v || !state.meta) return
    v.pause()

    const { width, height } = outputSize(state.meta.width, state.meta.height, state.options.maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: state.options.format === 'png' })
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(v, 0, 0, width, height)

    const mime =
      state.options.format === 'png'
        ? 'image/png'
        : state.options.format === 'webp'
          ? 'image/webp'
          : 'image/jpeg'
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, state.options.format === 'png' ? undefined : state.options.quality),
    )
    if (!blob) return

    const time = v.currentTime
    state.frames = [
      ...state.frames,
      {
        id: `cap-${time.toFixed(4)}-${state.frames.length}`,
        time,
        index: state.frames.length,
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
      },
    ]
      // Keep the gallery in timeline order.
      .sort((a, b) => a.time - b.time)
      .map((f, i) => ({ ...f, index: i }))

    renderGallery()
    renderActions()
    renderEstimate()
  }

  /* ------------------------------------------------------------ extraction */

  function runExtract() {
    if (!state.meta || !state.src || state.progress) return
    video()?.pause()
    revokeFrames()
    state.progress = { done: 0, total: planTimestamps(state.options).length, eta: null }
    renderGallery()
    renderActions()

    state.handle = extract(
      state.src,
      { width: state.meta.width, height: state.meta.height },
      state.options,
      (frame) => {
        state.frames.push(frame)
        appendFrame(frame)
      },
      (p) => {
        state.progress = p
        renderProgress()
      },
    )

    state.handle.frames
      .then((all) => {
        state.selected = new Set(all.map((f) => f.id))
      })
      .catch((e) => {
        if (!(e instanceof Cancelled)) {
          state.errorMessage = 'Something went wrong while extracting.'
          state.phase = 'error'
        }
      })
      .finally(() => {
        state.progress = null
        state.handle = null
        render()
      })
  }

  function cancelExtract() {
    state.handle?.cancel()
    // Keep whatever landed before the cancel.
    state.selected = new Set(state.frames.map((f) => f.id))
  }

  /* ------------------------------------------------------------- selection */

  function toggleFrame(id, shiftKey) {
    const all = state.frames
    if (shiftKey && state.lastToggled) {
      const a = all.findIndex((f) => f.id === state.lastToggled)
      const b = all.findIndex((f) => f.id === id)
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a]
        const turnOn = !state.selected.has(id)
        for (let i = lo; i <= hi; i++) {
          if (turnOn) state.selected.add(all[i].id)
          else state.selected.delete(all[i].id)
        }
        state.lastToggled = id
        renderSelection()
        return
      }
    }
    if (state.selected.has(id)) state.selected.delete(id)
    else state.selected.add(id)
    state.lastToggled = id
    renderSelection()
  }

  function removeFrame(id) {
    const hit = state.frames.find((f) => f.id === id)
    if (hit) URL.revokeObjectURL(hit.url)
    state.frames = state.frames.filter((f) => f.id !== id)
    state.selected.delete(id)
    renderGallery()
    renderActions()
  }

  /* --------------------------------------------------------------- exports */

  async function downloadZip() {
    const list = selectedFrames().length ? selectedFrames() : state.frames
    if (!list.length || !state.file) return
    state.zipping = true
    renderActions()
    try {
      await saveZip(list, state.file.name, state.options.format, state.naming)
    } finally {
      state.zipping = false
      renderActions()
    }
  }

  async function downloadSheet() {
    const list = selectedFrames().length ? selectedFrames() : state.frames
    if (!list.length || !state.file) return
    state.zipping = true
    renderActions()
    try {
      await saveContactSheet(list, state.file.name, list.length > 8 ? 4 : 3, (f) =>
        timecode(f.time, false),
      )
    } finally {
      state.zipping = false
      renderActions()
    }
  }

  /* =========================================================== rendering == */

  function render() {
    onPhaseChange?.(state.phase)

    if (state.phase === 'idle' || state.phase === 'loading') {
      mount.innerHTML = dropzoneMarkup
      wireDropzone()
      if (state.phase === 'loading') {
        mount.querySelector('#dropzone-title').textContent = 'Reading video…'
        mount.querySelector('#dropzone-icon use').setAttribute('href', '#i-loader')
        mount.querySelector('#dropzone-browse')?.setAttribute('hidden', '')
      }
      return
    }

    if (state.phase === 'error') {
      mount.innerHTML = `
        <div style="border:1px solid var(--line);background:var(--paper-2);padding:2rem">
          <span style="display:flex;align-items:center;justify-content:center;width:3rem;height:3rem;border:1px solid var(--accent);color:var(--accent-text)">
            ${icon('alert', 'ico ico-lg')}
          </span>
          <h2 class="display-3" style="margin-top:1.5rem">Couldn’t open that video</h2>
          <p class="prose-body" style="margin-top:1rem">${state.errorMessage}</p>
          <button class="btn btn-accent" id="retry" style="margin-top:2rem">
            ${icon('refresh')} Try another file
          </button>
        </div>`
      mount.querySelector('#retry').addEventListener('click', reset)
      return
    }

    renderStudio()
  }

  function renderStudio() {
    const m = state.meta
    mount.innerHTML = `
      <div class="panel">
        <div class="player-stage checker media-surface">
          <video id="v" playsinline preload="auto"></video>
        </div>
        <div class="player-controls">
          <div class="timeline" id="timeline">
            <div class="timeline-strip" id="strip"></div>
            <div class="timeline-dim" id="dim-start"></div>
            <div class="timeline-dim" id="dim-end"></div>
            <div class="timeline-sel" id="sel"></div>
            <div class="timeline-handle" id="h-start" role="slider" tabindex="0" aria-label="Set range start"><i></i></div>
            <div class="timeline-handle" id="h-end" role="slider" tabindex="0" aria-label="Set range end"><i></i></div>
            <div class="timeline-playhead" id="playhead"><i></i></div>
            <div class="timeline-preview" id="preview" hidden><img alt="" id="preview-img" /><span id="preview-tc"></span></div>
          </div>
          <div class="timeline-readout">
            <span id="rd-in">IN 00:00.000</span>
            <span class="now" id="rd-now">00:00.000</span>
            <span id="rd-out">OUT 00:00.000</span>
          </div>

          <div class="control-row">
            <span class="tip" data-tip="Play / pause · Space"><button class="btn btn-solid btn-icon" id="play">${icon('play')}</button></span>
            <span class="control-sep"></span>
            <span class="tip" data-tip="Back 1 second · ←"><button class="btn btn-quiet btn-icon" id="back1">${icon('skip-back')}</button></span>
            <span class="tip" data-tip="Previous frame · ,"><button class="btn btn-quiet btn-icon" id="prev">${icon('step-back')}</button></span>
            <span class="tip" data-tip="Next frame · ."><button class="btn btn-quiet btn-icon" id="next">${icon('step-fwd')}</button></span>
            <span class="tip" data-tip="Forward 1 second · →"><button class="btn btn-quiet btn-icon" id="fwd1">${icon('skip-fwd')}</button></span>
            <span class="control-sep"></span>
            <span class="tip" data-tip="Mute"><button class="btn btn-quiet btn-icon" id="mute">${icon('mute')}</button></span>
            <div class="control-right">
              <span class="tip" data-tip="Set range start · I"><button class="btn btn-outline" id="set-in"><span class="mono">[</span></button></span>
              <span class="tip" data-tip="Set range end · O"><button class="btn btn-outline" id="set-out"><span class="mono">]</span></button></span>
              <span class="tip" data-tip="Reset range"><button class="btn btn-quiet btn-icon" id="reset-range" hidden>${icon('reset')}</button></span>
              <span class="tip" data-tip="Capture this frame · C"><button class="btn btn-accent" id="capture">${icon('camera')}<span>Capture</span></button></span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar" id="action-bar"></div>
      <div id="gallery"></div>
    `

    els = {
      video: mount.querySelector('#v'),
      timeline: mount.querySelector('#timeline'),
      strip: mount.querySelector('#strip'),
      dimStart: mount.querySelector('#dim-start'),
      dimEnd: mount.querySelector('#dim-end'),
      sel: mount.querySelector('#sel'),
      hStart: mount.querySelector('#h-start'),
      hEnd: mount.querySelector('#h-end'),
      playhead: mount.querySelector('#playhead'),
      preview: mount.querySelector('#preview'),
      previewImg: mount.querySelector('#preview-img'),
      previewTc: mount.querySelector('#preview-tc'),
      rdIn: mount.querySelector('#rd-in'),
      rdNow: mount.querySelector('#rd-now'),
      rdOut: mount.querySelector('#rd-out'),
      play: mount.querySelector('#play'),
      mute: mount.querySelector('#mute'),
      resetRange: mount.querySelector('#reset-range'),
      actionBar: mount.querySelector('#action-bar'),
      gallery: mount.querySelector('#gallery'),
    }

    els.video.src = state.src
    els.video.muted = state.muted

    // ---- video events ----
    const sync = () => {
      state.current = els.video.currentTime
      renderTimeline()
    }
    els.video.addEventListener('timeupdate', sync)
    els.video.addEventListener('seeking', sync)
    els.video.addEventListener('seeked', sync)
    els.video.addEventListener('play', () => {
      state.playing = true
      renderPlayButton()
    })
    els.video.addEventListener('pause', () => {
      state.playing = false
      renderPlayButton()
    })
    els.video.addEventListener('ended', () => {
      state.playing = false
      renderPlayButton()
    })
    els.video.addEventListener('click', togglePlay)

    // ---- controls ----
    els.play.addEventListener('click', togglePlay)
    mount.querySelector('#back1').addEventListener('click', () => seek(state.current - 1))
    mount.querySelector('#fwd1').addEventListener('click', () => seek(state.current + 1))
    mount.querySelector('#prev').addEventListener('click', () => stepFrame(-1))
    mount.querySelector('#next').addEventListener('click', () => stepFrame(1))
    els.mute.addEventListener('click', () => {
      state.muted = !state.muted
      els.video.muted = state.muted
      els.mute.querySelector('use').setAttribute('href', state.muted ? '#i-mute' : '#i-volume')
    })
    mount.querySelector('#set-in').addEventListener('click', () =>
      setRange(Math.min(state.current, state.options.end - 0.05), state.options.end),
    )
    mount.querySelector('#set-out').addEventListener('click', () =>
      setRange(state.options.start, Math.max(state.current, state.options.start + 0.05)),
    )
    els.resetRange.addEventListener('click', () => setRange(0, m.duration))
    mount.querySelector('#capture').addEventListener('click', captureCurrent)

    wireTimeline()
    renderStrip()
    renderTimeline()
    renderActions()
    renderGallery()
  }

  /* ---------------------------------------------------------- header/meta */

  function renderHeader(headerEl) {
    if (!headerEl || !state.meta || !state.file) return
    const m = state.meta
    headerEl.innerHTML = `
      <p class="eyebrow">01 — Extractor</p>
      <div class="file-title-row">
        <h1 class="file-title">${escapeHtml(state.file.name)}</h1>
        <button class="btn btn-outline" id="new-video">${icon('refresh')} New video</button>
      </div>
      <dl class="meta-grid">
        <div class="meta-cell"><dt>Size</dt><dd>${m.width}×${m.height}</dd></div>
        <div class="meta-cell"><dt>Duration</dt><dd>${timecode(m.duration, false)}</dd></div>
        <div class="meta-cell"><dt>Frame rate</dt><dd>${m.fps}${m.fpsMeasured ? '' : ' (est.)'}</dd></div>
        <div class="meta-cell"><dt>File</dt><dd>${bytes(state.file.size)}</dd></div>
      </dl>`
    headerEl.querySelector('#new-video').addEventListener('click', reset)
  }

  /* -------------------------------------------------------------- timeline */

  function renderStrip() {
    if (!els.strip) return
    els.strip.innerHTML = state.thumbs.map((src) => `<img src="${src}" alt="" draggable="false" />`).join('')
  }

  function renderTimeline() {
    if (!els.timeline || !state.meta) return
    const d = state.meta.duration || 1
    const pct = (t) => `${(t / d) * 100}%`
    const { start, end } = state.options

    els.dimStart.style.insetInlineStart = '0'
    els.dimStart.style.width = pct(start)
    els.dimEnd.style.insetInlineEnd = '0'
    els.dimEnd.style.width = `${100 - (end / d) * 100}%`
    els.sel.style.insetInlineStart = pct(start)
    els.sel.style.width = `${((end - start) / d) * 100}%`
    els.hStart.style.insetInlineStart = pct(start)
    els.hEnd.style.insetInlineStart = pct(end)
    els.playhead.style.insetInlineStart = pct(state.current)

    els.hStart.setAttribute('aria-valuenow', String(start))
    els.hEnd.setAttribute('aria-valuenow', String(end))
    els.rdIn.textContent = `IN ${timecode(start)}`
    els.rdNow.textContent = timecode(state.current)
    els.rdOut.textContent = `OUT ${timecode(end)}`
    els.resetRange.hidden = start <= 0.001 && end >= d - 0.001
  }

  function renderPlayButton() {
    els.play?.querySelector('use').setAttribute('href', state.playing ? '#i-pause' : '#i-play')
  }

  function wireTimeline() {
    const timeAt = (clientX) => {
      const rect = els.timeline.getBoundingClientRect()
      if (!rect.width) return 0
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      return ratio * (state.meta?.duration || 0)
    }

    let drag = null

    els.timeline.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.timeline-handle')) return
      seek(timeAt(e.clientX))
      drag = 'playhead'
    })
    els.hStart.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      drag = 'start'
    })
    els.hEnd.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      drag = 'end'
    })

    // One window listener keeps dragging alive outside the track.
    const move = (e) => {
      if (!drag) return
      const t = timeAt(e.clientX)
      if (drag === 'playhead') seek(t)
      else if (drag === 'start') setRange(Math.min(t, state.options.end - 0.05), state.options.end)
      else setRange(state.options.start, Math.max(t, state.options.start + 0.05))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', () => (drag = null))
    window.addEventListener('pointercancel', () => (drag = null))

    // Hover preview off the filmstrip.
    els.timeline.addEventListener('pointermove', (e) => {
      if (!state.thumbs.length || !state.meta) return
      const rect = els.timeline.getBoundingClientRect()
      const t = timeAt(e.clientX)
      const i = Math.min(
        state.thumbs.length - 1,
        Math.floor((t / state.meta.duration) * state.thumbs.length),
      )
      els.preview.hidden = false
      els.preview.style.insetInlineStart = `${e.clientX - rect.left}px`
      els.previewImg.src = state.thumbs[i]
      els.previewTc.textContent = timecode(t, false)
    })
    els.timeline.addEventListener('pointerleave', () => (els.preview.hidden = true))

    // Keyboard-adjustable range handles.
    for (const [el, which] of [
      [els.hStart, 'start'],
      [els.hEnd, 'end'],
    ]) {
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const step = (e.shiftKey ? 1 : 0.1) * (e.key === 'ArrowLeft' ? -1 : 1)
        const d = state.meta.duration
        if (which === 'start') {
          setRange(
            Math.min(Math.max(0, state.options.start + step), state.options.end - 0.05),
            state.options.end,
          )
        } else {
          setRange(
            state.options.start,
            Math.max(Math.min(d, state.options.end + step), state.options.start + 0.05),
          )
        }
      })
    }
  }

  /* ------------------------------------------------------------ action bar */

  function renderActions() {
    if (!els.actionBar) return
    const busy = !!state.progress
    const sel = selectedFrames().length
    const total = state.frames.length

    if (busy) {
      els.actionBar.innerHTML = `
        <button class="btn btn-outline" id="cancel">${icon('x')} Cancel</button>
        <div class="progress-wrap">
          <div class="progress-track"><div class="progress-fill" id="fill"></div></div>
          <span class="progress-text" id="ptext"></span>
        </div>`
      els.actionBar.querySelector('#cancel').addEventListener('click', cancelExtract)
      renderProgress()
      return
    }

    els.actionBar.innerHTML = `
      <button class="btn btn-accent" id="run">${icon('play')} Extract frames</button>
      ${
        total
          ? `<span class="control-sep"></span>
        <span class="tip" data-tip="Select all · ⌘A"><button class="btn btn-quiet btn-icon" id="sel-all" aria-label="Select all">${icon('select-all')}</button></span>
        <span class="tip" data-tip="Clear selection"><button class="btn btn-quiet btn-icon" id="sel-none" aria-label="Clear selection">${icon('select-none')}</button></span>
        <span class="tip" data-tip="Invert"><button class="btn btn-quiet btn-icon" id="sel-inv" aria-label="Invert selection">${icon('invert')}</button></span>
        <span class="select-count" id="sel-count">${sel} selected</span>
        <div class="action-right">
          <button class="btn btn-quiet btn-danger" id="clear">${icon('trash')}<span>Clear</span></button>
          <button class="btn btn-outline" id="sheet" ${state.zipping ? 'disabled' : ''}>${icon('grid')}<span>Contact sheet</span></button>
          <button class="btn btn-accent" id="zip" ${state.zipping ? 'disabled' : ''}>
            ${icon(state.zipping ? 'loader' : 'zip')}
            ${state.zipping ? 'Building ZIP…' : sel && sel !== total ? `Download selected (${sel})` : 'Download ZIP'}
          </button>
        </div>`
          : ''
      }`

    els.actionBar.querySelector('#run').addEventListener('click', runExtract)
    if (!total) return

    els.actionBar.querySelector('#sel-all').addEventListener('click', () => {
      state.selected = new Set(state.frames.map((f) => f.id))
      renderSelection()
    })
    els.actionBar.querySelector('#sel-none').addEventListener('click', () => {
      state.selected = new Set()
      renderSelection()
    })
    els.actionBar.querySelector('#sel-inv').addEventListener('click', () => {
      state.selected = new Set(
        state.frames.filter((f) => !state.selected.has(f.id)).map((f) => f.id),
      )
      renderSelection()
    })
    els.actionBar.querySelector('#clear').addEventListener('click', () => {
      revokeFrames()
      renderGallery()
      renderActions()
    })
    els.actionBar.querySelector('#sheet').addEventListener('click', downloadSheet)
    els.actionBar.querySelector('#zip').addEventListener('click', downloadZip)
  }

  function renderProgress() {
    const fill = els.actionBar?.querySelector('#fill')
    const text = els.actionBar?.querySelector('#ptext')
    if (!fill || !text || !state.progress) return
    const { done, total, eta } = state.progress
    fill.style.width = `${total ? (done / total) * 100 : 0}%`
    text.textContent = `${done} of ${total}${eta !== null ? ` · ~${Math.ceil(eta)}s left` : ''}`
  }

  /* --------------------------------------------------------------- gallery */

  function renderGallery() {
    if (!els.gallery) return

    if (!state.frames.length) {
      els.gallery.innerHTML = `
        <div class="gallery-empty">
          <span class="numeral">03</span>
          <p>No frames yet. Set your sampling options and hit extract.</p>
        </div>`
      return
    }

    els.gallery.innerHTML = `
      <div class="gallery-head">
        <span class="numeral">03</span>
        <span class="gallery-total" id="g-total"></span>
        <span class="gallery-sizes">
          <button class="btn btn-quiet btn-icon" data-size="sm" aria-label="Small thumbnails">${icon('grid3')}</button>
          <button class="btn btn-quiet btn-icon" data-size="md" aria-label="Medium thumbnails">${icon('grid')}</button>
          <button class="btn btn-quiet btn-icon" data-size="lg" aria-label="Large thumbnails">${icon('grid1')}</button>
        </span>
      </div>
      <div class="frame-grid size-${state.gridSize}" id="grid"></div>`

    els.grid = els.gallery.querySelector('#grid')
    els.gTotal = els.gallery.querySelector('#g-total')

    els.gallery.querySelectorAll('[data-size]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.size === state.gridSize))
      b.addEventListener('click', () => {
        state.gridSize = b.dataset.size
        renderGallery()
      })
    })

    state.frames.forEach(appendFrame)
    renderSelection()
  }

  /** Appends one frame — used during extraction so the DOM isn't rebuilt per frame. */
  function appendFrame(frame) {
    if (!els.grid) return
    const fig = document.createElement('figure')
    fig.className = 'frame'
    fig.dataset.id = frame.id
    fig.innerHTML = `
      <button class="frame-pick" aria-pressed="false" aria-label="Frame at ${timecode(frame.time)}">
        <img src="${frame.url}" alt="" loading="lazy" class="checker media-surface" draggable="false" />
      </button>
      <span class="frame-tick">${icon('check', 'ico ico-sm')}</span>
      <div class="frame-actions">
        <span class="tip tip-below" data-tip="Jump to this time"><button class="frame-action" data-act="seek" aria-label="Jump to this time">${icon('target', 'ico ico-sm')}</button></span>
        <span class="tip tip-below" data-tip="Copy"><button class="frame-action" data-act="copy" aria-label="Copy">${icon('copy', 'ico ico-sm')}</button></span>
        <span class="tip tip-below" data-tip="Download"><button class="frame-action" data-act="save" aria-label="Download">${icon('download', 'ico ico-sm')}</button></span>
        <span class="tip tip-below" data-tip="Remove"><button class="frame-action danger" data-act="remove" aria-label="Remove">${icon('trash', 'ico ico-sm')}</button></span>
      </div>
      <figcaption><span class="tc">${timecode(frame.time)}</span><span>${bytes(frame.blob.size)}</span></figcaption>`

    fig.querySelector('.frame-pick').addEventListener('click', (e) => toggleFrame(frame.id, e.shiftKey))
    fig.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.act
        if (act === 'seek') seek(frame.time)
        else if (act === 'remove') removeFrame(frame.id)
        else if (act === 'save') {
          saveFrame(
            frame,
            state.file.name,
            state.options.format,
            state.naming,
            String(state.frames.length).length,
          )
        } else if (act === 'copy') {
          const ok = await copyFrame(frame)
          const tip = btn.closest('.tip')
          tip.dataset.tip = ok ? 'Copied' : 'Copy isn’t supported here'
          setTimeout(() => (tip.dataset.tip = 'Copy'), 1600)
        }
      })
    })

    els.grid.appendChild(fig)
    renderTotals()
  }

  function renderTotals() {
    if (!els.gTotal) return
    const total = state.frames.reduce((sum, f) => sum + f.blob.size, 0)
    els.gTotal.textContent = `${state.frames.length} · ${bytes(total)}`
  }

  /** Selection is a class flip — never a gallery rebuild. */
  function renderSelection() {
    els.grid?.querySelectorAll('.frame').forEach((fig) => {
      const on = state.selected.has(fig.dataset.id)
      fig.classList.toggle('is-selected', on)
      fig.querySelector('.frame-pick').setAttribute('aria-pressed', String(on))
    })
    const count = els.actionBar?.querySelector('#sel-count')
    if (count) count.textContent = `${selectedFrames().length} selected`
    renderTotals()
  }

  /* -------------------------------------------------------- settings panel */

  function renderSettings(panel) {
    if (!panel) return
    const o = state.options
    const out = state.meta
      ? outputSize(state.meta.width, state.meta.height, o.maxEdge)
      : { width: 0, height: 0 }
    const frameCount = planTimestamps(o).length

    const help = {
      interval: `One frame every ${o.interval}s across the range`,
      fps: `Sample at ${o.sampleFps} frames per second`,
      count: `Spread ${o.count} frames evenly across the range`,
      every: `Capture all ${frameCount} source frames — slowest, largest`,
    }[o.mode]

    const numberRow =
      o.mode === 'interval'
        ? { label: 'Interval (seconds)', key: 'interval', min: 0.02, max: 60, step: 0.1 }
        : o.mode === 'fps'
          ? { label: 'Sample rate (fps)', key: 'sampleFps', min: 0.1, max: Math.max(1, Math.round(o.sourceFps)), step: 0.5 }
          : o.mode === 'count'
            ? { label: 'Number of frames', key: 'count', min: 1, max: 2000, step: 1 }
            : null

    panel.innerHTML = `
      <div class="panel">
        <div class="settings-head">
          <span class="numeral">02</span>
          <h2>Extraction settings</h2>
        </div>
        <div class="settings-body">
          <section>
            <div>
              <span class="label">Sampling</span>
              <div class="segment segment-2">
                ${Object.entries(MODE_LABELS)
                  .map(
                    ([v, l]) =>
                      `<button class="segment-item" data-mode="${v}" aria-pressed="${o.mode === v}">${l}</button>`,
                  )
                  .join('')}
              </div>
              <p class="mode-help">${help}</p>
              ${
                numberRow
                  ? `<label style="display:block;margin-top:1rem">
                      <span class="label">${numberRow.label}</span>
                      <span class="number-row">
                        <input type="range" class="slider" id="n-range" min="${numberRow.min}" max="${numberRow.max}" step="${numberRow.step}" value="${o[numberRow.key]}" />
                        <input type="number" class="field" id="n-num" min="${numberRow.min}" max="${numberRow.max}" step="${numberRow.step}" value="${o[numberRow.key]}" />
                      </span>
                    </label>`
                  : ''
              }
            </div>
          </section>

          <div class="rule"></div>

          <section>
            <div>
              <span class="label">Format</span>
              <div class="segment segment-${formats.length}">
                ${formats
                  .map(
                    (f) =>
                      `<button class="segment-item" data-format="${f}" aria-pressed="${o.format === f}">${f}</button>`,
                  )
                  .join('')}
              </div>
            </div>

            ${
              o.format !== 'png'
                ? `<label style="display:block">
                    <span class="label label-between">Quality<span class="mono" style="color:var(--accent-text);letter-spacing:normal">${Math.round(o.quality * 100)}%</span></span>
                    <input type="range" class="slider" id="q-range" min="0.3" max="1" step="0.01" value="${o.quality}" />
                  </label>`
                : ''
            }

            <div>
              <span class="label">Resolution</span>
              <div class="segment segment-4">
                ${EDGE_PRESETS.map(
                  (e) =>
                    `<button class="segment-item" data-edge="${e}" aria-pressed="${o.maxEdge === e}">${e === 0 ? '1:1' : e}</button>`,
                ).join('')}
              </div>
              <p class="res-readout">${out.width}×${out.height}${o.maxEdge === 0 ? ' · NATIVE' : ''}</p>
            </div>

            <div>
              <span class="label">File names</span>
              <div class="segment segment-3">
                ${Object.entries(NAME_LABELS)
                  .map(
                    ([v, l]) =>
                      `<button class="segment-item" data-naming="${v}" aria-pressed="${state.naming === v}">${l}</button>`,
                  )
                  .join('')}
              </div>
            </div>
          </section>

          <section class="sunken estimate">
            <span class="label">Estimate</span>
            <div class="estimate-row">
              <p class="stat-value" id="est-count">${frameCount.toLocaleString()}<span class="stat-unit">frames</span></p>
              <span class="mono" id="est-size" style="font-size:0.875rem;color:var(--ink-2)"></span>
            </div>
            <p class="estimate-note">Size is estimated from the first frames you extract.</p>
          </section>
        </div>
      </div>`

    const busy = !!state.progress
    panel.querySelectorAll('.segment-item').forEach((b) => (b.disabled = busy))

    panel.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => {
        state.options.mode = b.dataset.mode
        renderSettings(panel)
      }),
    )
    panel.querySelectorAll('[data-format]').forEach((b) =>
      b.addEventListener('click', () => {
        state.options.format = b.dataset.format
        renderSettings(panel)
      }),
    )
    panel.querySelectorAll('[data-edge]').forEach((b) =>
      b.addEventListener('click', () => {
        state.options.maxEdge = Number(b.dataset.edge)
        renderSettings(panel)
      }),
    )
    panel.querySelectorAll('[data-naming]').forEach((b) =>
      b.addEventListener('click', () => {
        state.naming = b.dataset.naming
        renderSettings(panel)
      }),
    )

    const q = panel.querySelector('#q-range')
    q?.addEventListener('input', () => {
      state.options.quality = Number(q.value)
      renderSettings(panel)
    })

    if (numberRow) {
      const range = panel.querySelector('#n-range')
      const num = panel.querySelector('#n-num')
      const clamp = (v) => Math.min(Math.max(v, numberRow.min), numberRow.max)
      const set = (v) => {
        const next = numberRow.key === 'count' ? Math.round(clamp(v)) : clamp(v)
        state.options[numberRow.key] = next
        range.value = String(next)
        num.value = String(next)
        renderEstimate()
        panel.querySelector('.mode-help').textContent = {
          interval: `One frame every ${next}s across the range`,
          fps: `Sample at ${next} frames per second`,
          count: `Spread ${next} frames evenly across the range`,
        }[state.options.mode]
      }
      range.addEventListener('input', () => set(Number(range.value)))
      num.addEventListener('change', () => {
        const v = Number(num.value)
        if (Number.isFinite(v)) set(v)
      })
    }

    renderEstimate()
  }

  function renderEstimate() {
    const panel = document.querySelector('#settings-panel')
    if (!panel) return
    const countEl = panel.querySelector('#est-count')
    const sizeEl = panel.querySelector('#est-size')
    if (!countEl || !sizeEl || !state.meta) return

    const o = state.options
    const out = outputSize(state.meta.width, state.meta.height, o.maxEdge)
    const frameCount = planTimestamps(o).length

    // Before any measurement, fall back to a rough bits-per-pixel figure.
    const perFrame =
      measuredBytesPerFrame() ??
      out.width *
        out.height *
        (o.format === 'png' ? 1.6 : o.format === 'webp' ? 0.1 : 0.16) *
        (o.format === 'png' ? 1 : Math.max(0.25, o.quality))

    countEl.innerHTML = `${frameCount.toLocaleString()}<span class="stat-unit">frames</span>`
    sizeEl.textContent = bytes(Math.round(frameCount * perFrame))
  }

  /* --------------------------------------------------------------- dropzone */

  function wireDropzone() {
    const zone = mount.querySelector('#dropzone')
    if (!zone) return
    zone.addEventListener('click', () => document.querySelector('#file-input').click())
  }

  /* ----------------------------------------------------------------- public */

  return {
    state,
    openFile,
    reset,
    render,
    renderHeader,
    renderSettings,
    renderEstimate,
    togglePlay,
    stepFrame,
    seek,
    setRange,
    captureCurrent,
    runExtract,
    cancelExtract,
    selectAll: () => {
      state.selected = new Set(state.frames.map((f) => f.id))
      renderSelection()
    },
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
