import { MIME } from './format.js'
import { hasFrameCallback, seekTo } from './video.js'

/**
 * Frame extraction engine.
 *
 * @typedef {Object} ExtractOptions
 * @property {'interval'|'fps'|'count'|'every'} mode
 * @property {number} interval   seconds between frames (mode: interval)
 * @property {number} sampleFps  frames per second to sample (mode: fps)
 * @property {number} count      total frames across the range (mode: count)
 * @property {number} start
 * @property {number} end
 * @property {'png'|'jpeg'|'webp'} format
 * @property {number} quality    0–1, ignored for png
 * @property {number} maxEdge    longest-edge cap in px; 0 keeps native size
 * @property {number} sourceFps
 *
 * @typedef {Object} Frame
 * @property {string} id
 * @property {number} time
 * @property {number} index
 * @property {Blob} blob
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

export class Cancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'Cancelled'
  }
}

/**
 * The exact timestamps a given configuration will capture.
 * @param {ExtractOptions} o
 * @returns {number[]}
 */
export function planTimestamps(o) {
  const start = Math.max(0, Math.min(o.start, o.end))
  const end = Math.max(start, o.end)
  const span = end - start
  const times = []

  if (o.mode === 'count') {
    const n = Math.max(1, Math.floor(o.count))
    if (n === 1) return [start]
    // Include both endpoints.
    for (let i = 0; i < n; i++) times.push(start + (span * i) / (n - 1))
    return times
  }

  const step =
    o.mode === 'interval'
      ? Math.max(1e-3, o.interval)
      : o.mode === 'fps'
        ? 1 / Math.max(1e-3, o.sampleFps)
        : 1 / Math.max(1e-3, o.sourceFps)

  // Nudge onto the middle of each frame so we don't land on a boundary.
  const half = o.mode === 'every' ? step / 2 : 0
  for (let t = start + half; t <= end + 1e-6; t += step) times.push(Math.min(t, end))
  if (!times.length) times.push(start)
  return times
}

/**
 * Output pixel size after applying the longest-edge cap. Never upscales.
 * @returns {{width:number,height:number}}
 */
export function outputSize(w, h, maxEdge) {
  if (!maxEdge || maxEdge <= 0) return { width: w, height: h }
  const longest = Math.max(w, h)
  if (longest <= maxEdge) return { width: w, height: h }
  const scale = maxEdge / longest
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

function toBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode-failed'))),
      MIME[format],
      format === 'png' ? undefined : quality,
    )
  })
}

function makeFrame(blob, time, index, width, height) {
  return {
    id: `${index}-${time.toFixed(4)}`,
    time,
    index,
    blob,
    url: URL.createObjectURL(blob),
    width,
    height,
  }
}

function report(cb, done, total, startedAt) {
  const elapsed = (performance.now() - startedAt) / 1000
  const eta = done >= 3 ? Math.max(0, (elapsed / done) * (total - done)) : null
  cb({ done, total, eta })
}

/**
 * Captures frames from a dedicated video element, so the on-screen preview
 * stays interactive. Emits each frame as it is encoded.
 *
 * @param {string} src
 * @param {{width:number,height:number}} meta
 * @param {ExtractOptions} options
 * @param {(frame: Frame) => void} onFrame
 * @param {(p: {done:number,total:number,eta:number|null}) => void} onProgress
 * @returns {{frames: Promise<Frame[]>, cancel: () => void}}
 */
export function extract(src, meta, options, onFrame, onProgress) {
  let cancelled = false
  const times = planTimestamps(options)

  const run = async () => {
    const video = document.createElement('video')
    video.src = src
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const { width, height } = outputSize(meta.width, meta.height, options.maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: options.format === 'png' })
    if (!ctx) throw new Error('no-canvas-context')
    ctx.imageSmoothingQuality = 'high'

    const frames = []
    const startedAt = performance.now()

    try {
      await new Promise((resolve, reject) => {
        if (video.readyState >= 2) return resolve()
        video.addEventListener('loadeddata', () => resolve(), { once: true })
        video.addEventListener('error', () => reject(new Error('decode-failed')), { once: true })
      })

      const useSequential = options.mode === 'every' && hasFrameCallback() && times.length > 60

      if (useSequential) {
        await captureByPlayback(
          video,
          times,
          async (time, index) => {
            ctx.drawImage(video, 0, 0, width, height)
            const blob = await toBlob(canvas, options.format, options.quality)
            const frame = makeFrame(blob, time, index, width, height)
            frames.push(frame)
            onFrame(frame)
            report(onProgress, frames.length, times.length, startedAt)
          },
          () => cancelled,
          options,
        )
      } else {
        for (let i = 0; i < times.length; i++) {
          if (cancelled) throw new Cancelled()
          await seekTo(video, times[i])
          if (cancelled) throw new Cancelled()
          ctx.drawImage(video, 0, 0, width, height)
          const blob = await toBlob(canvas, options.format, options.quality)
          const frame = makeFrame(blob, video.currentTime, i, width, height)
          frames.push(frame)
          onFrame(frame)
          report(onProgress, i + 1, times.length, startedAt)
          // Let the UI paint between frames.
          if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0))
        }
      }

      if (cancelled) throw new Cancelled()
      return frames
    } finally {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }

  return {
    frames: run(),
    cancel: () => {
      cancelled = true
    },
  }
}

/**
 * For "every frame" runs, playing the video and grabbing each presented frame is
 * far faster than seeking once per frame (no repeated keyframe hunts).
 */
async function captureByPlayback(video, times, draw, isCancelled, options) {
  await seekTo(video, options.start)
  const frameGap = 1 / Math.max(1e-3, options.sourceFps)
  const total = times.length
  let index = 0
  let lastTime = -Infinity

  await new Promise((resolve, reject) => {
    let queued = false
    let finished = false

    const finish = (err) => {
      if (finished) return
      finished = true
      video.pause()
      err ? reject(err) : resolve()
    }

    const tick = async (_now, meta) => {
      if (finished) return
      if (isCancelled()) return finish(new Cancelled())

      const t = meta.mediaTime
      if (t > options.end + frameGap / 2) return finish()

      // Skip duplicates when the compositor re-presents the same frame.
      if (t - lastTime >= frameGap * 0.5) {
        lastTime = t
        queued = true
        try {
          await draw(t, index++)
        } catch (e) {
          return finish(e)
        }
        queued = false
      }

      if (index >= total) return finish()
      video.requestVideoFrameCallback(tick)
    }

    video.addEventListener('ended', () => !queued && finish(), { once: true })
    video.addEventListener('error', () => finish(new Error('decode-failed')), { once: true })
    video.requestVideoFrameCallback(tick)
    video.play().catch((e) => finish(e))
  })
}
