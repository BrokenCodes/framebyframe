import { useMemo, useState } from 'react'
import {
  Check,
  ClipboardCopy,
  Crosshair,
  Download,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Trash2,
} from 'lucide-react'
import type { Frame } from '../lib/extract'
import { bytes, timecode } from '../lib/format'
import { copyFrame } from '../lib/download'
import { useI18n } from '../i18n'
import { Tip } from './Tip'

export type GridSize = 'sm' | 'md' | 'lg'

const COLS: Record<GridSize, string> = {
  sm: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8',
  md: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5',
  lg: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}

interface Props {
  frames: Frame[]
  selected: Set<string>
  gridSize: GridSize
  onGridSize: (s: GridSize) => void
  onToggle: (id: string, shiftKey: boolean) => void
  onSeek: (time: number) => void
  onDownload: (frame: Frame) => void
  onRemove: (id: string) => void
}

export function FrameGrid(props: Props) {
  const { t } = useI18n()
  const { frames, selected } = props
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState(false)

  const totalBytes = useMemo(() => frames.reduce((sum, f) => sum + f.blob.size, 0), [frames])

  if (!frames.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
        style={{ border: '1px dashed var(--line-strong)' }}
      >
        <span className="numeral">03</span>
        <p className="max-w-xs text-[11px] uppercase leading-relaxed tracking-[0.14em]" style={{ color: 'var(--ink-3)' }}>
          {t('noFrames')}
        </p>
      </div>
    )
  }

  const handleCopy = async (frame: Frame) => {
    const ok = await copyFrame(frame)
    if (ok) {
      setCopiedId(frame.id)
      setTimeout(() => setCopiedId((id) => (id === frame.id ? null : id)), 1400)
    } else {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2200)
    }
  }

  return (
    <div>
      <div
        className="mb-4 flex items-center gap-3 pb-3"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <span className="numeral">03</span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--ink-2)' }}>
          {frames.length} · {bytes(totalBytes)}
        </span>
        {copyError && (
          <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--accent-text)' }}>
            {t('copyFailed')}
          </span>
        )}
        <div className="ms-auto flex items-center gap-0.5">
          {(
            [
              ['sm', Grid3x3],
              ['md', Grid2x2],
              ['lg', LayoutGrid],
            ] as const
          ).map(([size, Icon]) => (
            <button
              key={size}
              className="btn btn-quiet btn-icon"
              aria-pressed={props.gridSize === size}
              aria-label={`${t('gridSize')} ${size}`}
              onClick={() => props.onGridSize(size)}
              style={{
                background: props.gridSize === size ? 'var(--ink)' : undefined,
                color: props.gridSize === size ? 'var(--paper)' : undefined,
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-3 ${COLS[props.gridSize]}`}>
        {frames.map((frame) => {
          const isSelected = selected.has(frame.id)
          return (
            <figure
              key={frame.id}
              className="rise group relative"
              style={{
                background: 'var(--paper-2)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--line)'}`,
                outline: isSelected ? '1px solid var(--accent)' : 'none',
              }}
            >
              <button
                type="button"
                className="block w-full cursor-pointer"
                onClick={(e) => props.onToggle(frame.id, e.shiftKey)}
                aria-pressed={isSelected}
                aria-label={`${t('captured')} ${timecode(frame.time)}`}
              >
                <img
                  src={frame.url}
                  alt=""
                  loading="lazy"
                  className="checker media-surface block aspect-video w-full object-contain"
                  draggable={false}
                />
              </button>

              {/* selection tick */}
              <span
                className="pointer-events-none absolute start-2 top-2 flex h-5 w-5 items-center justify-center"
                style={{
                  background: isSelected ? 'var(--accent)' : 'rgb(11 11 13 / 0.6)',
                  border: '1px solid rgb(255 255 255 / 0.35)',
                }}
              >
                {/* Overlays sit on the constant-dark media surface, so light-on-dark
                    is correct in both themes here. */}
                {isSelected && <Check size={13} color="var(--media-fg)" />}
              </span>

              {/* hover actions */}
              <div className="absolute end-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <IconAction label={t('seekHere')} onClick={() => props.onSeek(frame.time)}>
                  <Crosshair size={13} />
                </IconAction>
                <IconAction
                  label={copiedId === frame.id ? t('copied') : t('copy')}
                  onClick={() => handleCopy(frame)}
                >
                  {copiedId === frame.id ? <Check size={13} /> : <ClipboardCopy size={13} />}
                </IconAction>
                <IconAction label={t('download')} onClick={() => props.onDownload(frame)}>
                  <Download size={13} />
                </IconAction>
                <IconAction label={t('remove')} onClick={() => props.onRemove(frame.id)} danger>
                  <Trash2 size={13} />
                </IconAction>
              </div>

              <figcaption
                className="flex items-center justify-between px-2 py-1.5 font-mono text-[10px]"
                style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}
              >
                <span style={{ color: 'var(--ink)' }}>{timecode(frame.time)}</span>
                <span>{bytes(frame.blob.size)}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </div>
  )
}

function IconAction({
  label,
  onClick,
  children,
  danger,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <Tip label={label} side="bottom">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-7 w-7 items-center justify-center backdrop-blur transition-colors"
        style={{
          background: danger ? 'var(--accent)' : 'rgb(11 11 13 / 0.72)',
          color: 'var(--media-fg)',
          border: '1px solid rgb(255 255 255 / 0.2)',
        }}
      >
        {children}
      </button>
    </Tip>
  )
}
