import {
  CheckSquare,
  FileArchive,
  Grid,
  Loader2,
  Play,
  RefreshCw,
  Square,
  SquareDashed,
  Trash2,
  X,
} from 'lucide-react'
import type { Frame, Progress } from '../lib/extract'
import { bytes, timecode } from '../lib/format'
import type { VideoMeta } from '../lib/video'
import { Player } from '../components/Player'
import { SettingsPanel } from '../components/SettingsPanel'
import { FrameGrid, type GridSize } from '../components/FrameGrid'
import { Tip } from '../components/Tip'
import { useI18n } from '../i18n'
import type { ExtractOptions } from '../lib/extract'
import type { NameTemplate } from '../lib/download'

interface Props {
  file: File
  meta: VideoMeta
  src: string
  videoRef: React.Ref<HTMLVideoElement>
  current: number
  playing: boolean
  muted: boolean
  thumbs: string[]
  options: ExtractOptions
  naming: NameTemplate
  frames: Frame[]
  selected: Set<string>
  selectedFrames: Frame[]
  gridSize: GridSize
  progress: Progress | null
  zipping: boolean
  measuredBytesPerFrame: number | null
  onReset: () => void
  onTogglePlay: () => void
  onToggleMute: () => void
  onSeek: (t: number) => void
  onStepFrame: (d: number) => void
  onRangeChange: (s: number, e: number) => void
  onCapture: () => void
  onOptionsChange: (patch: Partial<ExtractOptions>) => void
  onNamingChange: (n: NameTemplate) => void
  onGridSize: (s: GridSize) => void
  onToggleFrame: (id: string, shift: boolean) => void
  onRemoveFrame: (id: string) => void
  onClearFrames: () => void
  onSelectAll: () => void
  onSelectNone: () => void
  onInvertSelection: () => void
  onDownloadFrame: (f: Frame) => void
  onDownloadZip: () => void
  onDownloadSheet: () => void
  onExtract: () => void
  onCancel: () => void
}

export function Studio(props: Props) {
  const { t } = useI18n()
  const { meta, options, frames, progress } = props
  const busy = progress !== null

  return (
    <section
      id="extractor"
      className="band band-alt scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-label={t('settings')}
    >
      <div className="shell pt-24 pb-14 lg:pt-32 lg:pb-20">
        {/* ---- file header ---- */}
        <div className="mb-6">
          <p className="eyebrow">01 — EXTRACTOR</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <h1
              className="display-3 max-w-full break-all"
              style={{ fontSize: 'clamp(1.375rem,3vw,2.25rem)' }}
            >
              {props.file.name}
            </h1>
            <button className="btn btn-outline ms-auto" onClick={props.onReset}>
              <RefreshCw size={14} />
              {t('newVideo')}
            </button>
          </div>

          <div
            className="mt-5 grid grid-cols-2 gap-px sm:grid-cols-4"
            style={{ background: 'var(--line)' }}
          >
            {[
              [t('dimensions'), `${meta.width}×${meta.height}`],
              [t('duration'), timecode(meta.duration, false)],
              [t('fps'), `${meta.fps}${meta.fpsMeasured ? '' : ` (${t('fpsApprox')})`}`],
              [t('fileSize'), bytes(props.file.size)],
            ].map(([label, value]) => (
              <div key={label} className="px-4 py-3" style={{ background: 'var(--paper)' }}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {label}
                </p>
                <p className="mt-1.5 font-mono text-sm" style={{ color: 'var(--ink)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <Player
              ref={props.videoRef}
              src={props.src}
              duration={meta.duration}
              current={props.current}
              playing={props.playing}
              muted={props.muted}
              start={options.start}
              end={options.end}
              thumbs={props.thumbs}
              fps={meta.fps}
              onTogglePlay={props.onTogglePlay}
              onToggleMute={props.onToggleMute}
              onSeek={props.onSeek}
              onStepFrame={props.onStepFrame}
              onRangeChange={props.onRangeChange}
              onSetIn={() => props.onRangeChange(Math.min(props.current, options.end - 0.05), options.end)}
              onSetOut={() => props.onRangeChange(options.start, Math.max(props.current, options.start + 0.05))}
              onResetRange={() => props.onRangeChange(0, meta.duration)}
              onCapture={props.onCapture}
            />

            {/* ---- action bar ---- */}
            <div
              className="flex flex-wrap items-center gap-2 p-3"
              style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}
            >
              {busy ? (
                <>
                  <button className="btn btn-outline" onClick={props.onCancel}>
                    <X size={14} />
                    {t('cancel')}
                  </button>
                  <div className="flex min-w-44 flex-1 items-center gap-3">
                    <div className="h-1 flex-1" style={{ background: 'var(--line-strong)' }}>
                      <div
                        className="h-full transition-[width] duration-150"
                        style={{
                          width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {t('progress', { done: progress.done, total: progress.total })}
                      {progress.eta !== null
                        ? ` · ${t('etaLabel', { time: `${Math.ceil(progress.eta)}s` })}`
                        : ''}
                    </span>
                  </div>
                </>
              ) : (
                <button className="btn btn-accent" onClick={props.onExtract}>
                  <Play size={14} />
                  {t('extract')}
                </button>
              )}

              {frames.length > 0 && (
                <>
                  <span className="mx-1 h-6 w-px" style={{ background: 'var(--line)' }} />
                  <Tip label={`${t('selectAll')} · ⌘A`}>
                    <button className="btn btn-quiet btn-icon" onClick={props.onSelectAll} aria-label={t('selectAll')}>
                      <CheckSquare size={15} />
                    </button>
                  </Tip>
                  <Tip label={t('selectNone')}>
                    <button className="btn btn-quiet btn-icon" onClick={props.onSelectNone} aria-label={t('selectNone')}>
                      <Square size={15} />
                    </button>
                  </Tip>
                  <Tip label={t('invertSelection')}>
                    <button
                      className="btn btn-quiet btn-icon"
                      onClick={props.onInvertSelection}
                      aria-label={t('invertSelection')}
                    >
                      <SquareDashed size={15} />
                    </button>
                  </Tip>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {t('selectedCount', { n: props.selectedFrames.length })}
                  </span>

                  <div className="ms-auto flex flex-wrap items-center gap-2">
                    <button
                      className="btn btn-quiet"
                      onClick={props.onClearFrames}
                      disabled={props.zipping}
                      style={{ color: 'var(--accent-text)' }}
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">{t('clearFrames')}</span>
                    </button>
                    <button className="btn btn-outline" onClick={props.onDownloadSheet} disabled={props.zipping}>
                      <Grid size={14} />
                      <span className="hidden sm:inline">{t('contactSheet')}</span>
                    </button>
                    <button className="btn btn-accent" onClick={props.onDownloadZip} disabled={props.zipping}>
                      {props.zipping ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileArchive size={14} />
                      )}
                      {props.zipping
                        ? t('zipping')
                        : props.selectedFrames.length && props.selectedFrames.length !== frames.length
                          ? t('downloadSelected', { n: props.selectedFrames.length })
                          : t('downloadZip')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <FrameGrid
              frames={frames}
              selected={props.selected}
              gridSize={props.gridSize}
              onGridSize={props.onGridSize}
              onToggle={props.onToggleFrame}
              onSeek={props.onSeek}
              onDownload={props.onDownloadFrame}
              onRemove={props.onRemoveFrame}
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SettingsPanel
              options={options}
              onChange={props.onOptionsChange}
              naming={props.naming}
              onNamingChange={props.onNamingChange}
              source={{ width: meta.width, height: meta.height }}
              measuredBytesPerFrame={props.measuredBytesPerFrame}
              disabled={busy}
            />
          </aside>
        </div>
      </div>
    </section>
  )
}
