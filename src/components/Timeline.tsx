import { useCallback, useEffect, useRef, useState } from 'react'
import { timecode } from '../lib/format'
import { useI18n } from '../i18n'

interface Props {
  duration: number
  current: number
  start: number
  end: number
  /** Preview thumbnails as data URLs, evenly spaced across the whole duration. */
  thumbs: string[]
  onSeek: (time: number) => void
  onRangeChange: (start: number, end: number) => void
}

type Drag = 'playhead' | 'start' | 'end' | null

export function Timeline({ duration, current, start, end, thumbs, onSeek, onRangeChange }: Props) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag>(null)
  const [hover, setHover] = useState<{ time: number; x: number } | null>(null)

  const pct = (time: number) => (duration > 0 ? (time / duration) * 100 : 0)

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return 0
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      return ratio * duration
    },
    [duration],
  )

  // A single pointer-move listener on window keeps dragging alive outside the track.
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const time = timeAt(e.clientX)
      if (drag === 'playhead') onSeek(time)
      else if (drag === 'start') onRangeChange(Math.min(time, end - 0.05), end)
      else onRangeChange(start, Math.max(time, start + 0.05))
    }
    const up = () => setDrag(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, timeAt, onSeek, onRangeChange, start, end])

  const thumbIndexFor = (time: number) =>
    thumbs.length ? Math.min(thumbs.length - 1, Math.floor((time / duration) * thumbs.length)) : -1

  const hoverThumb = hover ? thumbs[thumbIndexFor(hover.time)] : undefined

  return (
    <div className="select-none">
      <div
        ref={trackRef}
        className="group relative h-16 cursor-pointer overflow-hidden"
        style={{ background: 'var(--paper-3)', border: '1px solid var(--line)' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).dataset.handle) return
          onSeek(timeAt(e.clientX))
          setDrag('playhead')
        }}
        onPointerMove={(e) => {
          const rect = trackRef.current?.getBoundingClientRect()
          if (!rect) return
          setHover({ time: timeAt(e.clientX), x: e.clientX - rect.left })
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* thumbnail filmstrip */}
        <div className="pointer-events-none absolute inset-0 flex">
          {thumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-full flex-1 object-cover"
              style={{ minWidth: 0, opacity: 0.75 }}
              draggable={false}
            />
          ))}
        </div>

        {/* dim everything outside the selected range */}
        <div
          className="pointer-events-none absolute inset-y-0 start-0"
          style={{ width: `${pct(start)}%`, background: 'var(--strip-dim)' }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 end-0"
          style={{ width: `${100 - pct(end)}%`, background: 'var(--strip-dim)' }}
        />
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{
            insetInlineStart: `${pct(start)}%`,
            width: `${pct(end) - pct(start)}%`,
            boxShadow: 'inset 0 0 0 2px var(--accent)',
          }}
        />

        {/* range handles */}
        {(['start', 'end'] as const).map((which) => (
          <div
            key={which}
            data-handle={which}
            role="slider"
            tabIndex={0}
            aria-label={which === 'start' ? t('setIn') : t('setOut')}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={which === 'start' ? start : end}
            aria-valuetext={timecode(which === 'start' ? start : end)}
            onPointerDown={(e) => {
              e.stopPropagation()
              setDrag(which)
            }}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 1 : 0.1
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
              e.preventDefault()
              const delta = e.key === 'ArrowLeft' ? -step : step
              if (which === 'start') onRangeChange(Math.min(Math.max(0, start + delta), end - 0.05), end)
              else onRangeChange(start, Math.max(Math.min(duration, end + delta), start + 0.05))
            }}
            className="absolute inset-y-0 z-20 flex w-4 cursor-ew-resize items-stretch justify-center"
            style={{
              insetInlineStart: `${pct(which === 'start' ? start : end)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span data-handle={which} className="w-1.5" style={{ background: 'var(--accent)' }} />
          </div>
        ))}

        {/* playhead */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px"
          style={{
            insetInlineStart: `${pct(current)}%`,
            background: 'var(--strip-fg)',
            boxShadow: '0 0 0 1px rgb(0 0 0 / 0.6)',
          }}
        >
          <span
            className="absolute -top-px start-1/2 h-2 w-2 -translate-x-1/2"
            style={{ background: 'var(--strip-fg)' }}
          />
        </div>

        {/* hover preview */}
        {hover && (
          <div
            className="pointer-events-none absolute bottom-full z-30 mb-2 -translate-x-1/2"
            style={{
              insetInlineStart: hover.x,
              background: 'var(--paper-2)',
              border: '1px solid var(--line-strong)',
            }}
          >
            {hoverThumb && <img src={hoverThumb} alt="" className="block h-16 w-auto" draggable={false} />}
            <div
              className="px-2 py-1 text-center font-mono text-[10px]"
              style={{ color: 'var(--ink-2)' }}
            >
              {timecode(hover.time, false)}
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider"
        style={{ color: 'var(--ink-3)' }}
      >
        <span>IN {timecode(start)}</span>
        <span style={{ color: 'var(--accent-text)' }}>{timecode(current)}</span>
        <span>OUT {timecode(end)}</span>
      </div>
    </div>
  )
}
