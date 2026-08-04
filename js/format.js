/** Formatting helpers and encoder capability probing. */

export const MIME = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const EXT = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/**
 * Formats seconds as HH:MM:SS.mmm, dropping the hour part when it is zero.
 * @param {number} seconds
 * @param {boolean} [withMs=true]
 * @returns {string}
 */
export function timecode(seconds, withMs = true) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return withMs ? `${base}.${pad(ms, 3)}` : base
}

/** Same as timecode but safe inside a filename. */
export function timecodeSlug(seconds) {
  return timecode(seconds).replace(/[:.]/g, '-')
}

/** @param {number} n */
export function bytes(n) {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  // Decide precision from the rounded value, so 9.96 reads "10 KB" not "10.0 KB".
  return `${Math.round(v * 10) / 10 < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** Strips the extension so the source name can prefix output filenames. */
export function baseName(fileName) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_') || 'video'
}

/**
 * Which encoders this browser actually supports, tested against a real canvas
 * rather than assumed from the format list.
 * @returns {string[]}
 */
export function supportedFormats() {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  return ['png', 'jpeg', 'webp'].filter((f) => c.toDataURL(MIME[f]).startsWith(`data:${MIME[f]}`))
}
