export type ImageFormat = 'png' | 'jpeg' | 'webp'

export const MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const EXT: Record<ImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** Formats seconds as HH:MM:SS.mmm, dropping the hour part when it is zero. */
export function timecode(seconds: number, withMs = true): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return withMs ? `${base}.${pad(ms, 3)}` : base
}

/** Same as timecode but safe for use inside a filename. */
export function timecodeSlug(seconds: number): string {
  return timecode(seconds).replace(/[:.]/g, '-')
}

export function bytes(n: number): string {
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

/** Strips the extension so we can use the source name as a filename prefix. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_') || 'video'
}

const CANDIDATES: ImageFormat[] = ['png', 'jpeg', 'webp']

/** Which encoders this browser actually supports, tested against a real canvas. */
export function supportedFormats(): ImageFormat[] {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  return CANDIDATES.filter((f) => c.toDataURL(MIME[f]).startsWith(`data:${MIME[f]}`))
}
