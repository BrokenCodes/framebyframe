import { PRIVACY } from '../content'

export function Privacy() {
  return (
    <section
      id="privacy"
      className="band band-alt scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="privacy-h"
    >
      <div className="shell py-16 lg:py-28">
        <p className="eyebrow">{PRIVACY.eyebrow}</p>
        <h2 id="privacy-h" className="display-2 mt-7 max-w-3xl">
          {PRIVACY.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          <span className="accent-serif">{PRIVACY.headlineAccent}</span>
        </h2>

        <div className="mt-14 grid lg:mt-20 lg:grid-cols-4">
          {PRIVACY.points.map((point, i) => (
            <article
              key={point.num}
              className="border-t py-8 lg:border-t-0 lg:py-0"
              style={{
                borderColor: 'var(--line)',
                borderInlineStart: i > 0 ? '1px solid var(--line)' : undefined,
                paddingInlineStart: i > 0 ? '2rem' : undefined,
                paddingInlineEnd: '2rem',
              }}
            >
              <span className="numeral">{point.num}</span>
              <h3 className="display-3 mt-5" style={{ fontSize: 'clamp(1.125rem,1.6vw,1.3125rem)' }}>
                {point.title}
              </h3>
              <p className="prose-body mt-3 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
                {point.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
