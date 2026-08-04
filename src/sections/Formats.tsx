import { FORMATS, type FormatRow } from '../content'
import { protectBrand } from '../lib/brand'

export function Formats() {
  return (
    <section
      id="formats"
      className="band scroll-mt-20"
      style={{ background: 'var(--paper)' }}
      aria-labelledby="formats-h"
    >
      <div className="shell py-16 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="eyebrow">{FORMATS.eyebrow}</p>
            <h2 id="formats-h" className="display-2 mt-7">
              {FORMATS.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="accent-serif">{FORMATS.headlineAccent}</span>
            </h2>
          </div>
          <p className="lede lg:pt-4">{protectBrand(FORMATS.lede)}</p>
        </div>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-2 lg:gap-16">
          <FormatTable title={FORMATS.inputTitle} num="01" rows={FORMATS.inputRows} note={FORMATS.inputNote} />
          <FormatTable title={FORMATS.outputTitle} num="02" rows={FORMATS.outputRows} />
        </div>
      </div>
    </section>
  )
}

function FormatTable({
  title,
  num,
  rows,
  note,
}: {
  title: string
  num: string
  rows: FormatRow[]
  note?: string
}) {
  return (
    <div>
      <div className="flex items-baseline gap-4">
        <span className="numeral">{num}</span>
        <h3 className="display-3" style={{ fontSize: 'clamp(1.375rem,2.2vw,1.75rem)' }}>
          {title}
        </h3>
      </div>

      {/* Horizontal scroll container so narrow screens never push the page sideways. */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-start">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line-strong)' }}>
              {['Format', 'Codec / kind', 'Notes'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="py-3 pe-4 text-start text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.format} style={{ borderBottom: '1px solid var(--line)' }}>
                <th
                  scope="row"
                  className="py-4 pe-4 text-start align-top font-mono text-[13px] font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  {row.format}
                </th>
                <td className="py-4 pe-4 align-top text-[13px]" style={{ color: 'var(--ink-2)' }}>
                  {row.container}
                </td>
                <td className="py-4 align-top text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {note && (
        <p className="mt-5 text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {note}
        </p>
      )}
    </div>
  )
}
