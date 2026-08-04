import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { Marquee } from './components/Marquee'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Hero } from './sections/Hero'
import { Studio } from './sections/Studio'
import { Stats } from './sections/Stats'
import { Manifesto } from './sections/Manifesto'
import { HowItWorks } from './sections/HowItWorks'
import { Capabilities } from './sections/Capabilities'
import { UseCases } from './sections/UseCases'
import { Formats } from './sections/Formats'
import { Privacy } from './sections/Privacy'
import { Faq } from './sections/Faq'
import { CtaBar } from './sections/CtaBar'
import type { GridSize } from './components/FrameGrid'
import {
  Cancelled,
  extract,
  outputSize,
  planTimestamps,
  type ExtractHandle,
  type ExtractOptions,
  type Frame,
  type Progress,
} from './lib/extract'
import { probe, seekTo, type VideoMeta } from './lib/video'
import { timecode } from './lib/format'
import { saveContactSheet, saveFrame, saveZip, type NameTemplate } from './lib/download'
import { I18nContext, t } from './i18n'
import { useTheme } from './lib/theme'
import { useConsent } from './lib/consent'
import { ConsentBanner } from './components/ConsentBanner'

type Phase = 'idle' | 'loading' | 'ready' | 'error'

const DEFAULT_OPTIONS: ExtractOptions = {
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

export default function App() {
  // ---- theme ----
  // The page has one source language (English); Google page translation handles
  // the rest and sets <html lang> itself when a reader picks a language.
  const { mode: themeMode, theme, setMode: setThemeMode } = useTheme()
  const consent = useConsent()

  // ---- source video ----
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorKey, setErrorKey] = useState<'errorDecode' | 'errorNoTrack' | 'errorGeneric'>('errorGeneric')
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string>('')
  const [meta, setMeta] = useState<VideoMeta | null>(null)
  const [thumbs, setThumbs] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  // ---- extraction ----
  const [options, setOptions] = useState<ExtractOptions>(DEFAULT_OPTIONS)
  const [naming, setNaming] = useState<NameTemplate>('both')
  const [frames, setFrames] = useState<Frame[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [gridSize, setGridSize] = useState<GridSize>('md')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [zipping, setZipping] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const handleRef = useRef<ExtractHandle | null>(null)
  const lastToggled = useRef<string | null>(null)

  const busy = progress !== null
  const framesRef = useRef(frames)
  framesRef.current = frames

  // Header sits transparent over the dark hero until the user scrolls past it.
  const [overHero, setOverHero] = useState(true)
  useEffect(() => {
    const onScroll = () => setOverHero(window.scrollY < 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Revoke every object URL on unmount so long sessions don't leak blobs.
  useEffect(
    () => () => {
      framesRef.current.forEach((f) => URL.revokeObjectURL(f.url))
    },
    [],
  )

  const measuredBytesPerFrame = useMemo(() => {
    if (!frames.length) return null
    return frames.reduce((sum, f) => sum + f.blob.size, 0) / frames.length
  }, [frames])

  // ---- load a file ----
  const openFile = useCallback(async (next: File) => {
    handleRef.current?.cancel()
    setProgress(null)
    setPhase('loading')
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url))
      return []
    })
    setSelected(new Set())
    setThumbs([])

    const url = URL.createObjectURL(next)
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setFile(next)

    const probeEl = document.createElement('video')
    probeEl.src = url
    probeEl.muted = true
    probeEl.playsInline = true
    probeEl.preload = 'auto'

    try {
      const info = await probe(probeEl)
      setMeta(info)
      setOptions((o) => ({
        ...o,
        start: 0,
        end: info.duration,
        sourceFps: info.fps,
        sampleFps: Math.min(o.sampleFps, Math.max(1, Math.round(info.fps))),
      }))
      setCurrent(0)
      setPhase('ready')
      void buildThumbs(url, info, setThumbs)
      // bring the workbench into view once it replaces the hero
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      setErrorKey(
        message === 'no-video-track'
          ? 'errorNoTrack'
          : message === 'decode-failed'
            ? 'errorDecode'
            : 'errorGeneric',
      )
      setPhase('error')
    } finally {
      probeEl.removeAttribute('src')
      probeEl.load()
    }
  }, [])

  const reset = useCallback(() => {
    handleRef.current?.cancel()
    setProgress(null)
    setPhase('idle')
    setFile(null)
    setMeta(null)
    setThumbs([])
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url))
      return []
    })
    setSelected(new Set())
    setOptions(DEFAULT_OPTIONS)
  }, [])

  // ---- playback wiring ----
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => setCurrent(video.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('seeking', onTime)
    video.addEventListener('seeked', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onPause)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('seeking', onTime)
      video.removeEventListener('seeked', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onPause)
    }
  }, [phase])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted, phase])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    const clamped = Math.min(Math.max(time, 0), video.duration)
    video.currentTime = clamped
    setCurrent(clamped)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }, [])

  const stepFrame = useCallback(
    (delta: number) => {
      const video = videoRef.current
      if (!video || !meta) return
      video.pause()
      seek(video.currentTime + delta / meta.fps)
    },
    [meta, seek],
  )

  const setRange = useCallback((start: number, end: number) => {
    setOptions((o) => ({ ...o, start, end }))
  }, [])

  // ---- single-frame capture ----
  const captureCurrent = useCallback(async () => {
    const video = videoRef.current
    if (!video || !meta) return
    video.pause()

    const { width, height } = outputSize(meta.width, meta.height, options.maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: options.format === 'png' })
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        options.format === 'png' ? 'image/png' : options.format === 'webp' ? 'image/webp' : 'image/jpeg',
        options.format === 'png' ? undefined : options.quality,
      ),
    )
    if (!blob) return

    const time = video.currentTime
    setFrames((prev) => {
      const frame: Frame = {
        id: `cap-${time.toFixed(4)}-${prev.length}`,
        time,
        index: prev.length,
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
      }
      // keep the gallery in timeline order
      return [...prev, frame].sort((a, b) => a.time - b.time).map((f, i) => ({ ...f, index: i }))
    })
  }, [meta, options.format, options.maxEdge, options.quality])

  // ---- batch extraction ----
  const runExtract = useCallback(() => {
    if (!meta || !src || busy) return
    videoRef.current?.pause()

    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url))
      return []
    })
    setSelected(new Set())
    setProgress({ done: 0, total: planTimestamps(options).length, eta: null })

    const handle = extract(
      src,
      { width: meta.width, height: meta.height },
      options,
      (frame) => setFrames((prev) => [...prev, frame]),
      (p) => setProgress(p),
    )
    handleRef.current = handle

    handle.frames
      .then((all) => setSelected(new Set(all.map((f) => f.id))))
      .catch((e) => {
        if (!(e instanceof Cancelled)) {
          setErrorKey('errorGeneric')
          setPhase('error')
        }
      })
      .finally(() => {
        setProgress(null)
        handleRef.current = null
      })
  }, [meta, src, busy, options])

  const cancelExtract = useCallback(() => {
    handleRef.current?.cancel()
    // select whatever landed before the cancel so the work isn't lost
    setSelected(new Set(framesRef.current.map((f) => f.id)))
  }, [])

  // ---- selection ----
  const toggleFrame = useCallback((id: string, shiftKey: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const all = framesRef.current
      if (shiftKey && lastToggled.current) {
        const a = all.findIndex((f) => f.id === lastToggled.current)
        const b = all.findIndex((f) => f.id === id)
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a]
          const turnOn = !prev.has(id)
          for (let i = lo; i <= hi; i++) {
            turnOn ? next.add(all[i].id) : next.delete(all[i].id)
          }
          lastToggled.current = id
          return next
        }
      }
      next.has(id) ? next.delete(id) : next.add(id)
      lastToggled.current = id
      return next
    })
  }, [])

  const removeFrame = useCallback((id: string) => {
    setFrames((prev) => {
      const hit = prev.find((f) => f.id === id)
      if (hit) URL.revokeObjectURL(hit.url)
      return prev.filter((f) => f.id !== id)
    })
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const clearFrames = useCallback(() => {
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url))
      return []
    })
    setSelected(new Set())
  }, [])

  const selectedFrames = useMemo(() => frames.filter((f) => selected.has(f.id)), [frames, selected])

  // ---- exports ----
  const downloadZip = useCallback(async () => {
    const list = selectedFrames.length ? selectedFrames : frames
    if (!list.length || !file) return
    setZipping(true)
    try {
      await saveZip(list, file.name, options.format, naming)
    } finally {
      setZipping(false)
    }
  }, [selectedFrames, frames, file, options.format, naming])

  const downloadSheet = useCallback(async () => {
    const list = selectedFrames.length ? selectedFrames : frames
    if (!list.length || !file) return
    setZipping(true)
    try {
      await saveContactSheet(list, file.name, list.length > 8 ? 4 : 3, (f) => timecode(f.time, false))
    } finally {
      setZipping(false)
    }
  }, [selectedFrames, frames, file])

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts((s) => !s)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && frames.length) {
        e.preventDefault()
        setSelected(new Set(frames.map((f) => f.id)))
        return
      }
      if (phase !== 'ready') return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case ',':
          e.preventDefault()
          stepFrame(-1)
          break
        case '.':
          e.preventDefault()
          stepFrame(1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(current - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(current + 1)
          break
        case 'c':
        case 'C':
          e.preventDefault()
          void captureCurrent()
          break
        case 'i':
        case 'I':
          e.preventDefault()
          setRange(Math.min(current, options.end - 0.05), options.end)
          break
        case 'o':
        case 'O':
          e.preventDefault()
          setRange(options.start, Math.max(current, options.start + 0.05))
          break
        case 'Enter':
          e.preventDefault()
          busy ? cancelExtract() : runExtract()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    phase,
    frames,
    current,
    options.start,
    options.end,
    busy,
    togglePlay,
    stepFrame,
    seek,
    captureCurrent,
    setRange,
    runExtract,
    cancelExtract,
  ])

  // Stable: `t` is a module-level function now that there is only one language.
  const i18nValue = useMemo(() => ({ t }), [])

  return (
    <I18nContext.Provider value={i18nValue}>
      <SiteHeader
        themeMode={themeMode}
        theme={theme}
        onThemeModeChange={setThemeMode}
        onShowShortcuts={() => setShowShortcuts(true)}
        atPageTop={overHero && phase !== 'error'}
      />

      <main>
        {phase === 'ready' && meta && file ? (
          <Studio
            file={file}
            meta={meta}
            src={src}
            videoRef={videoRef}
            current={current}
            playing={playing}
            muted={muted}
            thumbs={thumbs}
            options={options}
            naming={naming}
            frames={frames}
            selected={selected}
            selectedFrames={selectedFrames}
            gridSize={gridSize}
            progress={progress}
            zipping={zipping}
            measuredBytesPerFrame={measuredBytesPerFrame}
            onReset={reset}
            onTogglePlay={togglePlay}
            onToggleMute={() => setMuted((m) => !m)}
            onSeek={seek}
            onStepFrame={stepFrame}
            onRangeChange={setRange}
            onCapture={captureCurrent}
            onOptionsChange={(patch) => setOptions((o) => ({ ...o, ...patch }))}
            onNamingChange={setNaming}
            onGridSize={setGridSize}
            onToggleFrame={toggleFrame}
            onRemoveFrame={removeFrame}
            onClearFrames={clearFrames}
            onSelectAll={() => setSelected(new Set(frames.map((f) => f.id)))}
            onSelectNone={() => setSelected(new Set())}
            onInvertSelection={() =>
              setSelected(new Set(frames.filter((f) => !selected.has(f.id)).map((f) => f.id)))
            }
            onDownloadFrame={(frame) =>
              file && saveFrame(frame, file.name, options.format, naming, String(frames.length).length)
            }
            onDownloadZip={downloadZip}
            onDownloadSheet={downloadSheet}
            onExtract={runExtract}
            onCancel={cancelExtract}
          />
        ) : phase === 'error' ? (
          <section className="band" style={{ background: 'var(--paper)' }}>
            <div className="shell flex min-h-[70vh] flex-col justify-center py-24">
              <span
                className="flex h-14 w-14 items-center justify-center"
                style={{ border: '1px solid var(--accent)', color: 'var(--accent-text)' }}
              >
                <AlertTriangle size={24} />
              </span>
              <h1 className="display-2 mt-8 max-w-2xl">{t('errorTitle')}</h1>
              <p className="prose-body mt-6 max-w-xl">{t(errorKey)}</p>
              <button className="btn btn-accent mt-10 self-start" onClick={reset}>
                <RefreshCw size={14} />
                {t('tryAnother')}
              </button>
            </div>
          </section>
        ) : (
          <Hero onFile={openFile} busy={phase === 'loading'} />
        )}

        <Marquee />
        <Stats />
        <Manifesto />
        <HowItWorks />
        <Capabilities />
        <UseCases />
        <Formats />
        <Privacy />
        <Faq />
        <CtaBar />
      </main>

      <SiteFooter
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowPrivacyChoices={consent.reopen}
      />
      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ConsentBanner
        regime={consent.regime}
        choice={consent.choice}
        open={consent.open}
        onDecide={consent.decide}
        onDismiss={consent.dismiss}
      />
    </I18nContext.Provider>
  )
}

/**
 * Renders a low-res strip of thumbnails for the timeline. Runs off-screen and
 * best-effort — a failure here only costs the filmstrip, not the app.
 */
async function buildThumbs(
  url: string,
  meta: VideoMeta,
  setThumbs: (t: string[]) => void,
  count = 16,
) {
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
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true })
      video.addEventListener('error', () => reject(new Error('decode-failed')), { once: true })
    })

    const out: string[] = []
    for (let i = 0; i < count; i++) {
      const time = ((i + 0.5) / count) * meta.duration
      await seekTo(video, time)
      ctx.drawImage(video, 0, 0, width, height)
      out.push(canvas.toDataURL('image/jpeg', 0.6))
      // publish progressively so the strip fills in as it goes
      setThumbs([...out])
    }
  } catch {
    /* filmstrip is optional */
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}
