import { ArrowDown, ShieldCheck } from 'lucide-react'
import { HERO } from '../content'
import { Dropzone } from '../components/Dropzone'

interface Props {
  onFile: (file: File) => void
  busy: boolean
}

export function Hero({ onFile, busy }: Props) {
  return (
    <section
      id="top"
      className="band relative overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      {/* Layered wash standing in for a hero photograph; tuned per theme in CSS. */}
      <div aria-hidden="true" className="hero-wash pointer-events-none absolute inset-0" />
      {/* Faint vertical grid, like a drawing sheet. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, var(--ink) 0 1px, transparent 1px 12.5%)',
        }}
      />

      <div className="shell relative pt-28 pb-14 lg:pt-40 lg:pb-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          {/* ---- headline column ---- */}
          <div className="rise">
            <p className="eyebrow">{HERO.eyebrow}</p>

            <h1 className="display-1 mt-7">
              {HERO.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif block">{HERO.headlineAccent}</span>
            </h1>

            <div className="rule-strong my-8 lg:my-10" />

            <p className="lede">{HERO.lede}</p>

            <ul className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3" aria-label="Output formats">
              {HERO.disciplines.map((d) => (
                <li
                  key={d}
                  className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {d}
                </li>
              ))}
            </ul>

            <a
              href="#how-it-works"
              className="group mt-12 hidden items-center gap-4 lg:inline-flex"
              aria-label="Scroll to how it works"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full border transition-colors"
                style={{ borderColor: 'var(--line-strong)', color: 'var(--ink)' }}
              >
                <ArrowDown size={18} className="transition-transform group-hover:translate-y-1" />
              </span>
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: 'var(--ink-3)' }}
              >
                {HERO.scroll}
              </span>
            </a>
          </div>

          {/* ---- tool column ---- */}
          <div id="extractor" className="rise scroll-mt-24 lg:pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow eyebrow-plain eyebrow-accent">
                <ShieldCheck size={13} />
                Nothing leaves this device
              </p>
              <span className="numeral">01</span>
            </div>
            <Dropzone onFile={onFile} busy={busy} />
          </div>
        </div>
      </div>
    </section>
  )
}
