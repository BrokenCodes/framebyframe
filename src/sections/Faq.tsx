import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { FAQ } from '../content'
import { protectBrand } from '../lib/brand'

export function Faq() {
  // Multiple panels may be open at once; the first is open by default.
  const [open, setOpen] = useState<Set<number>>(new Set([0]))

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  return (
    <section
      id="faq"
      className="band scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="faq-h"
    >
      <div className="shell py-16 lg:py-28">
        <p className="eyebrow">{FAQ.eyebrow}</p>
        <h2 id="faq-h" className="display-2 mt-7 max-w-3xl">
          {FAQ.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          <span className="accent-serif">{FAQ.headlineAccent}</span>
        </h2>

        <dl className="mt-14 lg:mt-20">
          {FAQ.items.map((item, i) => {
            const isOpen = open.has(i)
            return (
              <div key={item.q} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <dt>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="group flex w-full items-start gap-5 py-6 text-start lg:gap-8"
                  >
                    <span className="numeral pt-2">{String(i + 1).padStart(2, '0')}</span>
                    <span
                      className="flex-1 font-display text-lg font-bold leading-snug tracking-tight transition-colors lg:text-xl"
                      style={{ color: isOpen ? 'var(--accent-text)' : 'var(--ink)' }}
                    >
                      {protectBrand(item.q)}
                    </span>
                    <span
                      className="mt-1 flex h-6 w-6 flex-none items-center justify-center border transition-colors"
                      style={{
                        borderColor: isOpen ? 'var(--accent)' : 'var(--line-strong)',
                        color: isOpen ? 'var(--accent-text)' : 'var(--ink-2)',
                      }}
                    >
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                </dt>
                <dd
                  id={`faq-panel-${i}`}
                  hidden={!isOpen}
                  className="pb-8 ps-9 pe-0 lg:ps-[4.5rem] lg:pe-16"
                >
                  <p className="prose-body">{protectBrand(item.a)}</p>
                </dd>
              </div>
            )
          })}
        </dl>
        <div className="rule" />
      </div>
    </section>
  )
}
