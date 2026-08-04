import { CAPABILITIES } from '../content'
import { protectBrand } from '../lib/brand'

export function Capabilities() {
  return (
    <section
      id="capabilities"
      className="band scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="cap-h"
    >
      <div className="shell py-16 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{CAPABILITIES.eyebrow}</p>
            <h2 id="cap-h" className="display-2 mt-7">
              {CAPABILITIES.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif">{CAPABILITIES.headlineAccent}</span>
            </h2>
          </div>
          <p className="lede lg:pt-4">{CAPABILITIES.lede}</p>
        </div>

        <div className="mt-14 grid lg:mt-20 lg:grid-cols-2">
          {CAPABILITIES.items.map((item, i) => (
            <article
              key={item.num}
              className="border-t py-8 lg:py-10"
              style={{
                borderColor: 'var(--line)',
                // hairline gutter between the two columns on wide screens
                paddingInlineEnd: i % 2 === 0 ? '2.5rem' : undefined,
                paddingInlineStart: i % 2 === 1 ? '2.5rem' : undefined,
                borderInlineStart: i % 2 === 1 ? '1px solid var(--line)' : undefined,
              }}
            >
              <div className="flex items-baseline gap-4">
                <span className="numeral">{item.num}</span>
                <h3 className="display-3" style={{ fontSize: 'clamp(1.25rem,2vw,1.5rem)' }}>
                  {item.title}
                </h3>
              </div>
              <p className="prose-body mt-4 ps-9" style={{ color: 'var(--ink-3)' }}>
                {protectBrand(item.body)}
              </p>
            </article>
          ))}
        </div>
        <div className="rule" />
      </div>
    </section>
  )
}
