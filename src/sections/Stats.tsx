import { STATS } from '../content'

export function Stats() {
  return (
    <section className="band band-alt" style={{ background: 'var(--paper)' }} aria-label="At a glance">
      <div className="shell py-14 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.num}
              className="px-0 py-6 lg:px-8 lg:py-2"
              style={{
                borderInlineStart: i % 2 === 0 ? undefined : '1px solid var(--line)',
                paddingInlineStart: i % 2 === 0 ? 0 : '1.5rem',
              }}
            >
              <span className="numeral" style={{ color: 'var(--ink-3)' }}>
                {stat.num}
              </span>
              <p className="stat-value mt-5">
                {stat.value}
                <span className="stat-unit">{stat.unit}</span>
              </p>
              <p className="mt-3 text-sm" style={{ color: 'var(--ink-3)' }}>
                {stat.caption}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
