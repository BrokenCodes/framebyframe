import { zip } from 'fflate'
import type { Frame } from './extract'
import { EXT, baseName, timecodeSlug, type ImageFormat } from './format'

export type NameTemplate = 'index' | 'timecode' | 'both'

export function frameName(
  frame: Frame,
  sourceName: string,
  format: ImageFormat,
  template: NameTemplate,
  padTo: number,
): string {
  const prefix = baseName(sourceName)
  const idx = String(frame.index + 1).padStart(padTo, '0')
  const tc = timecodeSlug(frame.time)
  const stem =
    template === 'index' ? idx : template === 'timecode' ? tc : `${idx}_${tc}`
  return `${prefix}_${stem}.${EXT[format]}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // give the browser a beat to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function saveFrame(
  frame: Frame,
  sourceName: string,
  format: ImageFormat,
  template: NameTemplate,
  padTo: number,
) {
  triggerDownload(frame.blob, frameName(frame, sourceName, format, template, padTo))
}

export async function copyFrame(frame: Frame): Promise<boolean> {
  try {
    if (!navigator.clipboard || !('write' in navigator.clipboard)) return false
    // Clipboard only reliably accepts PNG, so re-encode anything else.
    let blob = frame.blob
    if (blob.type !== 'image/png') {
      blob = await reencodePng(frame)
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

function reencodePng(frame: Frame): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = frame.width
      c.height = frame.height
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('no-canvas-context'))
      ctx.drawImage(img, 0, 0)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = frame.url
  })
}

/**
 * Bundles frames into a ZIP. Images are already compressed, so entries are
 * stored rather than deflated — much faster and about the same size.
 */
export async function saveZip(
  frames: Frame[],
  sourceName: string,
  format: ImageFormat,
  template: NameTemplate,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const padTo = String(frames.length).length
  const files: Record<string, [Uint8Array, { level: 0 }]> = {}

  for (let i = 0; i < frames.length; i++) {
    const buf = new Uint8Array(await frames[i].blob.arrayBuffer())
    files[frameName(frames[i], sourceName, format, template, padTo)] = [buf, { level: 0 }]
    onProgress?.((i + 1) / frames.length)
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data)))
  })

  triggerDownload(
    new Blob([zipped as BlobPart], { type: 'application/zip' }),
    `${baseName(sourceName)}_frames.zip`,
  )
}

/**
 * Renders selected frames into a single contact sheet — handy for picking a
 * thumbnail or sharing an overview of a clip.
 */
export async function saveContactSheet(
  frames: Frame[],
  sourceName: string,
  columns: number,
  labelWith: (frame: Frame) => string,
): Promise<void> {
  if (!frames.length) return
  const cols = Math.max(1, Math.min(columns, frames.length))
  const rows = Math.ceil(frames.length / cols)
  const cellW = 480
  const ratio = frames[0].height / frames[0].width
  const cellH = Math.round(cellW * ratio)
  const labelH = 28
  const gap = 8

  const canvas = document.createElement('canvas')
  canvas.width = cols * cellW + (cols + 1) * gap
  canvas.height = rows * (cellH + labelH) + (rows + 1) * gap
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no-canvas-context')
  ctx.fillStyle = '#0b0b0f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < frames.length; i++) {
    const img = await loadImage(frames[i].url)
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = gap + c * (cellW + gap)
    const y = gap + r * (cellH + labelH + gap)
    ctx.drawImage(img, x, y, cellW, cellH)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(labelWith(frames[i]), x + 4, y + cellH + labelH / 2)
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/jpeg', 0.9),
  )
  triggerDownload(blob, `${baseName(sourceName)}_contact_sheet.jpg`)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = url
  })
}
