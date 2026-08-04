import { HOW_IT_WORKS } from '../content'
import { protectBrand } from '../lib/brand'

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="band band-alt scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="how-h"
    >
      <div className="shell py-16 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{HOW_IT_WORKS.eyebrow}</p>
            <h2 id="how-h" className="display-2 mt-7">
              {HOW_IT_WORKS.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif">{HOW_IT_WORKS.headlineAccent}</span>
            </h2>
          </div>
          <p className="lede lg:pt-4">{HOW_IT_WORKS.lede}</p>
        </div>

        <ol className="mt-14 lg:mt-20">
          {HOW_IT_WORKS.steps.map((step) => (
            <li
              key={step.num}
              className="grid gap-3 border-t py-8 lg:grid-cols-[4rem_minmax(0,20rem)_minmax(0,1fr)] lg:gap-10 lg:py-10"
              style={{ borderColor: 'var(--line)' }}
            >
              <span className="numeral pt-1.5">{step.num}</span>
              <h3 className="display-3" style={{ fontSize: 'clamp(1.375rem,2.2vw,1.75rem)' }}>
                {step.title}
              </h3>
              <p className="prose-body" style={{ color: 'var(--ink-3)' }}>
                {protectBrand(step.body)}
              </p>
            </li>
          ))}
        </ol>
        <div className="rule" />
      </div>
    </section>
  )
}
