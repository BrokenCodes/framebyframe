import { USE_CASES } from '../content'

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="band band-alt scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="uses-h"
    >
      <div className="shell py-16 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{USE_CASES.eyebrow}</p>
            <h2 id="uses-h" className="display-2 mt-7">
              {USE_CASES.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif">{USE_CASES.headlineAccent}</span>
            </h2>
          </div>
          <p className="lede lg:pt-4">{USE_CASES.lede}</p>
        </div>

        <div className="mt-14 grid gap-px lg:mt-20 lg:grid-cols-3" style={{ background: 'var(--line)' }}>
          {USE_CASES.items.map((item) => (
            <article key={item.num} className="p-7 lg:p-9" style={{ background: 'var(--paper)' }}>
              <span className="numeral">{item.num}</span>
              <h3 className="display-3 mt-5" style={{ fontSize: 'clamp(1.1875rem,1.7vw,1.375rem)' }}>
                {item.title}
              </h3>
              <p className="prose-body mt-3 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
