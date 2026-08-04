import { ArrowRight } from 'lucide-react'
import { CTA } from '../content'

export function CtaBar() {
  return (
    <section className="band" style={{ background: 'var(--paper)' }} aria-labelledby="cta-h">
      <div className="shell py-16 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div>
            <h2 id="cta-h" className="display-2">
              {CTA.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif">{CTA.headlineAccent}</span>
            </h2>
            <p className="lede mt-6">{CTA.body}</p>
          </div>
        </div>
      </div>

      {/* Full-bleed accent bar */}
      <a
        href="#extractor"
        className="group flex items-center justify-between px-6 py-6 transition-colors lg:px-12 lg:py-8"
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] lg:text-base">
          {CTA.button}
        </span>
        <ArrowRight size={24} className="transition-transform group-hover:translate-x-2" />
      </a>
    </section>
  )
}
