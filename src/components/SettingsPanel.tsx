import { useMemo } from 'react'
import type { ExtractOptions, SampleMode } from '../lib/extract'
import { outputSize, planTimestamps } from '../lib/extract'
import { bytes, supportedFormats, type ImageFormat } from '../lib/format'
import type { NameTemplate } from '../lib/download'
import { useI18n } from '../i18n'

interface Props {
  options: ExtractOptions
  onChange: (patch: Partial<ExtractOptions>) => void
  naming: NameTemplate
  onNamingChange: (n: NameTemplate) => void
  source: { width: number; height: number }
  /** Average encoded bytes per frame observed so far, if any. */
  measuredBytesPerFrame: number | null
  disabled: boolean
}

const MODES: { value: SampleMode; labelKey: 'modeInterval' | 'modeFps' | 'modeCount' | 'modeEvery' }[] = [
  { value: 'interval', labelKey: 'modeInterval' },
  { value: 'fps', labelKey: 'modeFps' },
  { value: 'count', labelKey: 'modeCount' },
  { value: 'every', labelKey: 'modeEvery' },
]

const EDGE_PRESETS = [0, 1920, 1280, 640]

export function SettingsPanel(props: Props) {
  const { t } = useI18n()
  const { options, onChange, disabled } = props
  const formats = useMemo(supportedFormats, [])

  const frameCount = useMemo(() => planTimestamps(options).length, [options])
  const out = outputSize(props.source.width, props.source.height, options.maxEdge)

  // Before any real measurement, fall back to a rough bpp figure per codec.
  const perFrame =
    props.measuredBytesPerFrame ??
    out.width * out.height * (options.format === 'png' ? 1.6 : options.format === 'webp' ? 0.1 : 0.16) *
      (options.format === 'png' ? 1 : Math.max(0.25, options.quality))
  const estBytes = frameCount * perFrame

  const helpKey = (
    { interval: 'modeIntervalHelp', fps: 'modeFpsHelp', count: 'modeCountHelp', every: 'modeEveryHelp' } as const
  )[options.mode]
  const helpValue =
    options.mode === 'interval'
      ? options.interval
      : options.mode === 'fps'
        ? options.sampleFps
        : options.mode === 'count'
          ? options.count
          : frameCount

  return (
    <div style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
      <header
        className="flex items-baseline gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <span className="numeral">02</span>
        <h2
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--ink)' }}
        >
          {t('settings')}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-4">
        {/* ---- sampling ---- */}
        <section>
          <span className="label">{t('sampling')}</span>
          <div className="segment grid-cols-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className="segment-item"
                aria-pressed={options.mode === m.value}
                disabled={disabled}
                onClick={() => onChange({ mode: m.value })}
                style={{ borderTop: '1px solid var(--line)' }}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {t(helpKey, { n: helpValue })}
          </p>

          {options.mode === 'interval' && (
            <NumberRow
              label={t('interval')}
              value={options.interval}
              min={0.02}
              max={60}
              step={0.1}
              disabled={disabled}
              onChange={(interval) => onChange({ interval })}
            />
          )}
          {options.mode === 'fps' && (
            <NumberRow
              label={t('frameRate')}
              value={options.sampleFps}
              min={0.1}
              max={Math.max(1, Math.round(options.sourceFps))}
              step={0.5}
              disabled={disabled}
              onChange={(sampleFps) => onChange({ sampleFps })}
            />
          )}
          {options.mode === 'count' && (
            <NumberRow
              label={t('frameCount')}
              value={options.count}
              min={1}
              max={2000}
              step={1}
              disabled={disabled}
              onChange={(count) => onChange({ count: Math.round(count) })}
            />
          )}
        </section>

        <div className="rule" />

        {/* ---- output ---- */}
        <section className="flex flex-col gap-5">
          <div>
            <span className="label">{t('format')}</span>
            <div
              className="segment"
              style={{ gridTemplateColumns: `repeat(${formats.length}, minmax(0, 1fr))` }}
            >
              {formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="segment-item"
                  aria-pressed={options.format === f}
                  disabled={disabled}
                  onClick={() => onChange({ format: f as ImageFormat })}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {options.format !== 'png' && (
            <label className="block">
              <span className="label justify-between">
                {t('quality')}
                <span className="font-mono tracking-normal" style={{ color: 'var(--accent-text)' }}>
                  {Math.round(options.quality * 100)}%
                </span>
              </span>
              <input
                type="range"
                className="slider"
                min={0.3}
                max={1}
                step={0.01}
                value={options.quality}
                disabled={disabled}
                onChange={(e) => onChange({ quality: Number(e.target.value) })}
              />
            </label>
          )}

          <div>
            <span className="label">{t('resolution')}</span>
            <div className="segment grid-cols-4">
              {EDGE_PRESETS.map((edge) => (
                <button
                  key={edge}
                  type="button"
                  className="segment-item"
                  aria-pressed={options.maxEdge === edge}
                  disabled={disabled}
                  onClick={() => onChange({ maxEdge: edge })}
                >
                  {edge === 0 ? '1:1' : `${edge}`}
                </button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
              {out.width}×{out.height}
              {options.maxEdge === 0 ? ' · NATIVE' : ''}
            </p>
          </div>

          <div>
            <span className="label">{t('naming')}</span>
            <div className="segment grid-cols-3">
              {(
                [
                  ['index', t('nameIndex')],
                  ['timecode', t('nameTimecode')],
                  ['both', t('nameBoth')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="segment-item"
                  aria-pressed={props.naming === value}
                  onClick={() => props.onNamingChange(value as NameTemplate)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---- estimate ---- */}
        <section className="sunken p-4">
          <span className="label">{t('estimate')}</span>
          <div className="flex items-end justify-between">
            <p className="stat-value" style={{ fontSize: '2.25rem' }}>
              {frameCount.toLocaleString()}
              <span className="stat-unit">FRAMES</span>
            </p>
            <span className="font-mono text-sm" style={{ color: 'var(--ink-2)' }}>
              {bytes(Math.round(estBytes))}
            </span>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {t('estNote')}
          </p>
        </section>
      </div>
    </div>
  )
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  disabled: boolean
  onChange: (v: number) => void
}) {
  const clamp = (v: number) => Math.min(Math.max(v, min), max)
  return (
    <label className="mt-4 block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          className="slider flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <input
          type="number"
          className="field w-20 text-end font-mono"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (Number.isFinite(next)) onChange(clamp(next))
          }}
        />
      </div>
    </label>
  )
}
