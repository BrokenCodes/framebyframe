import { forwardRef } from 'react'
import {
  Camera,
  ChevronFirst,
  ChevronLast,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { Timeline } from './Timeline'
import { Tip } from './Tip'

interface Props {
  src: string
  duration: number
  current: number
  playing: boolean
  muted: boolean
  start: number
  end: number
  thumbs: string[]
  fps: number
  onTogglePlay: () => void
  onToggleMute: () => void
  onSeek: (time: number) => void
  onStepFrame: (delta: number) => void
  onRangeChange: (start: number, end: number) => void
  onSetIn: () => void
  onSetOut: () => void
  onResetRange: () => void
  onCapture: () => void
}

export const Player = forwardRef<HTMLVideoElement, Props>(function Player(props, ref) {
  const { t } = useI18n()
  const rangeIsFull = props.start <= 0.001 && props.end >= props.duration - 0.001

  return (
    <div style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <div className="checker media-surface flex items-center justify-center">
        <video
          ref={ref}
          src={props.src}
          className="max-h-[min(56vh,600px)] w-full object-contain"
          playsInline
          preload="auto"
          onClick={props.onTogglePlay}
        />
      </div>

      <div className="p-3 lg:p-4">
        <Timeline
          duration={props.duration}
          current={props.current}
          start={props.start}
          end={props.end}
          thumbs={props.thumbs}
          onSeek={props.onSeek}
          onRangeChange={props.onRangeChange}
        />

        <div className="mt-4 flex flex-wrap items-center gap-1">
          <Tip label={`${props.playing ? t('pause') : t('play')} · Space`}>
            <button className="btn btn-solid btn-icon" onClick={props.onTogglePlay}>
              {props.playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </Tip>

          <span className="mx-2 h-6 w-px" style={{ background: 'var(--line)' }} />

          <Tip label={`${t('jumpBack')} · ←`}>
            <button className="btn btn-quiet btn-icon" onClick={() => props.onSeek(props.current - 1)}>
              <SkipBack size={15} />
            </button>
          </Tip>
          <Tip label={`${t('prevFrame')} · ,`}>
            <button className="btn btn-quiet btn-icon" onClick={() => props.onStepFrame(-1)}>
              <ChevronFirst size={17} />
            </button>
          </Tip>
          <Tip label={`${t('nextFrame')} · .`}>
            <button className="btn btn-quiet btn-icon" onClick={() => props.onStepFrame(1)}>
              <ChevronLast size={17} />
            </button>
          </Tip>
          <Tip label={`${t('jumpForward')} · →`}>
            <button className="btn btn-quiet btn-icon" onClick={() => props.onSeek(props.current + 1)}>
              <SkipForward size={15} />
            </button>
          </Tip>

          <span className="mx-2 h-6 w-px" style={{ background: 'var(--line)' }} />

          <Tip label={props.muted ? t('unmuted') : t('muted')}>
            <button className="btn btn-quiet btn-icon" onClick={props.onToggleMute}>
              {props.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </Tip>

          <div className="ms-auto flex flex-wrap items-center gap-1">
            <Tip label={`${t('setIn')} · I`}>
              <button className="btn btn-outline" onClick={props.onSetIn}>
                <span className="font-mono">[</span>
                <span className="hidden xl:inline">IN</span>
              </button>
            </Tip>
            <Tip label={`${t('setOut')} · O`}>
              <button className="btn btn-outline" onClick={props.onSetOut}>
                <span className="font-mono">]</span>
                <span className="hidden xl:inline">OUT</span>
              </button>
            </Tip>
            {!rangeIsFull && (
              <Tip label={t('resetRange')}>
                <button className="btn btn-quiet btn-icon" onClick={props.onResetRange}>
                  <RotateCcw size={14} />
                </button>
              </Tip>
            )}

            <Tip label={`${t('captureFrame')} · C`}>
              <button className="btn btn-accent ms-1" onClick={props.onCapture}>
                <Camera size={15} />
                <span className="hidden sm:inline">{t('captureFrame')}</span>
              </button>
            </Tip>
          </div>
        </div>
      </div>
    </div>
  )
})
