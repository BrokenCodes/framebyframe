import { ArrowRight } from 'lucide-react'
import { MANIFESTO } from '../content'
import { protectBrand } from '../lib/brand'

export function Manifesto() {
  return (
    <section className="band band-alt" style={{ background: 'var(--paper)' }} aria-labelledby="manifesto-h">
      <div className="rule" />
      <div className="shell py-16 lg:py-28">
        <p className="eyebrow">{MANIFESTO.eyebrow}</p>

        <h2 id="manifesto-h" className="display-2 mt-7 max-w-3xl">
          {MANIFESTO.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          <span className="accent-serif">{MANIFESTO.headlineAccent}</span>
        </h2>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <p className="prose-body text-[1.0625rem] lg:text-lg" style={{ color: 'var(--ink)' }}>
            {protectBrand(MANIFESTO.body[0])}
          </p>
          <p className="prose-body" style={{ color: 'var(--ink-3)' }}>
            {protectBrand(MANIFESTO.body[1])}
          </p>
        </div>

        <div className="rule mt-12" />
        <a href="#how-it-works" className="link-arrow mt-7">
          {MANIFESTO.outLink}
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  )
}
