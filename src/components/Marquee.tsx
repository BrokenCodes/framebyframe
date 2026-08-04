import { MARQUEE_ITEMS } from '../content'

/**
 * Infinite ticker. The item list is duplicated so translating the track by -50%
 * lands exactly on the start of the second copy, making the loop seamless.
 */
export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee-item">
            {MARQUEE_ITEMS.map((item) => (
              <span key={item} className="flex items-center gap-10">
                {item}
                <span style={{ color: 'var(--accent)', fontSize: '0.5rem' }}>◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
