import { useEffect, useState } from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'
import type { ConsentChoice, ConsentRegime } from '../lib/consent'

interface Props {
  regime: ConsentRegime
  choice: ConsentChoice | null
  open: boolean
  onDecide: (analytics: boolean) => void
  onDismiss: () => void
}

/**
 * Consent notice, shaped by regime:
 *
 *  - `opt-in`  (GDPR/UK/CH, LGPD, PIPA, PDPA) — blocking, with Accept and Reject
 *              given equal visual weight. Refusing must be exactly as easy as
 *              accepting, so neither button is styled as the "quiet" option.
 *  - `opt-out` (US state laws) — non-blocking bar with an explicit opt-out.
 *  - `notice`  (elsewhere) — non-blocking disclosure with the same switch.
 *
 * Nothing here grants anything by itself; it only calls back with the decision.
 */
export function ConsentBanner({ regime, choice, open, onDecide, onDismiss }: Props) {
  const [details, setDetails] = useState(false)
  const blocking = regime === 'opt-in' && !choice

  // Escape closes only when a decision already exists — a blocking prompt must
  // not be dismissible without choosing.
  useEffect(() => {
    if (!open || blocking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, blocking, onDismiss])

  if (!open) return null

  const heading = blocking ? 'Before we measure anything' : 'How this site measures traffic'

  return (
    <>
      {blocking && (
        <div className="fixed inset-0 z-[70]" style={{ background: 'var(--scrim)' }} aria-hidden="true" />
      )}

      <div
        role="dialog"
        aria-modal={blocking}
        aria-label="Privacy and cookie choices"
        className="band fixed inset-x-0 bottom-0 z-[71]"
        style={{ background: 'var(--paper)', borderTop: '1px solid var(--line-strong)' }}
      >
        <div className="shell py-5 lg:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex-1">
              <p className="eyebrow eyebrow-plain eyebrow-accent">
                <ShieldCheck size={13} />
                {heading}
              </p>

              <p className="prose-body mt-3 text-[0.9375rem]">
                Your video never leaves this device and is never uploaded — that does not
                change. Separately, this page can load{' '}
                <strong style={{ color: 'var(--ink)' }}>Google Analytics</strong> to count
                visits, which sets cookies and shares your IP address with Google.
                {regime === 'opt-in'
                  ? ' Nothing is loaded until you choose.'
                  : ' You can turn it off at any time.'}
              </p>

              {details && (
                <dl
                  className="mt-4 grid gap-px sm:grid-cols-2"
                  style={{ background: 'var(--line)' }}
                >
                  {[
                    {
                      t: 'Essential',
                      required: true,
                      d: 'Your theme and consent choices, kept in local storage on this device. Never shared.',
                    },
                    {
                      t: 'Analytics',
                      required: false,
                      d: 'Google Analytics 4 — aggregate visit counts. Sets cookies and sees your IP. No advertising or profiling signals are ever enabled.',
                    },
                  ].map((row) => (
                    <div key={row.t} className="p-4" style={{ background: 'var(--paper)' }}>
                      <dt className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                          style={{ color: 'var(--ink)' }}
                        >
                          {row.t}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-[0.12em]"
                          style={{ color: row.required ? 'var(--ink-3)' : 'var(--accent-text)' }}
                        >
                          {row.required ? 'Always on' : 'Your choice'}
                        </span>
                      </dt>
                      <dd className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                        {row.d}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <button
                type="button"
                className="link-arrow mt-4"
                onClick={() => setDetails((d) => !d)}
                aria-expanded={details}
              >
                {details ? 'Hide details' : 'What gets stored'}
              </button>
            </div>

            {/* Actions. Accept and Reject share the same button treatment. */}
            <div className="flex flex-col gap-2 lg:w-64 lg:flex-none">
              <button className="btn btn-accent w-full" onClick={() => onDecide(true)}>
                <Check size={14} />
                Accept analytics
              </button>
              <button className="btn btn-outline w-full" onClick={() => onDecide(false)}>
                <X size={14} />
                {regime === 'opt-in' ? 'Reject analytics' : 'Opt out of analytics'}
              </button>

              {choice && (
                <button className="btn btn-quiet w-full" onClick={onDismiss}>
                  Close
                </button>
              )}

              {choice && (
                <p className="mt-1 text-center text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  Currently {choice.analytics ? 'accepted' : 'declined'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
