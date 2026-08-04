import { useCallback, useEffect, useState } from 'react'

/**
 * Consent state for Google Consent Mode v2.
 *
 * The defaults are declared in index.html *before* gtag.js loads — that inline
 * script is the compliance-critical half. This module owns the UI-facing half:
 * which regime a visitor falls under, what they chose, and pushing updates.
 *
 * Only `analytics` is offered because that is all the site actually uses. No
 * advertising signals are ever granted.
 */

export const CONSENT_KEY = 'framebyframe:consent'
/** Bump when the categories or their meaning change; invalidates old decisions. */
export const CONSENT_VERSION = 1

export interface ConsentChoice {
  analytics: boolean
  /** ISO timestamp of the decision — part of the audit trail GDPR expects. */
  decidedAt: string
  version: number
  regime: ConsentRegime
}

/**
 * How consent must be obtained:
 *  - `opt-in`  nothing non-essential until an affirmative choice (GDPR/UK/CH, …)
 *  - `opt-out` measurement permitted, but a clear opt-out must be offered (US states)
 *  - `notice`  measurement permitted, disclosure plus an easy way to turn it off
 */
export type ConsentRegime = 'opt-in' | 'opt-out' | 'notice'

/**
 * Timezone-based region hint. Deliberately network-free: an IP geolocation
 * lookup would itself transmit the visitor's address before they consented.
 *
 * It is therefore coarse, and **fails safe** — an unreadable timezone, or
 * anything Europe-adjacent, is treated as opt-in. Google separately enforces the
 * region-scoped defaults against the real IP, so a wrong guess here changes only
 * which banner is shown, never whether Google may measure an EEA visitor.
 */
export function inferRegime(): ConsentRegime {
  if (signalsDeny()) return 'opt-in'

  let tz = ''
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return 'opt-in'
  }
  if (!tz) return 'opt-in'

  // GDPR / UK GDPR / FADP, plus LGPD, PIPA and PDPA territories.
  if (
    /^Europe\//.test(tz) ||
    /^Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)/.test(tz) ||
    /^Asia\/(Nicosia|Famagusta|Seoul|Bangkok)/.test(tz) ||
    /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Araguaina|Maceio|Noronha|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Santarem)/.test(tz)
  ) {
    return 'opt-in'
  }

  // US and Canada: state privacy laws are opt-out with a mandatory "do not
  // sell/share" style control.
  if (/^America\//.test(tz) || /^(US|Canada|Pacific\/Honolulu)/.test(tz)) return 'opt-out'

  return 'notice'
}

/** Global Privacy Control / Do Not Track — honoured everywhere, not only where binding. */
export function signalsDeny(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string }
  return (
    nav.globalPrivacyControl === true ||
    nav.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === '1'
  )
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentChoice
    if (typeof parsed?.analytics !== 'boolean') return null
    // A stale version means the categories changed — ask again.
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function gtagUpdate(analytics: boolean) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== 'function') return
  gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    functionality_storage: analytics ? 'granted' : 'denied',
    // Never granted: this site serves no advertising.
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

/**
 * Best-effort removal of GA's own cookies when consent is withdrawn. Consent Mode
 * stops collection on its own, but leaving `_ga*` behind after a refusal looks
 * (and reads, to a regulator) like the refusal did nothing.
 */
function clearAnalyticsCookies() {
  const hosts = [location.hostname, `.${location.hostname}`]
  const bare = location.hostname.split('.').slice(-2).join('.')
  if (bare !== location.hostname) hosts.push(`.${bare}`)

  document.cookie.split(';').forEach((entry) => {
    const name = entry.split('=')[0]?.trim()
    if (!name || !/^_ga|^_gid$|^_gat/.test(name)) return
    hosts.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`
    })
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

export function useConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(readConsent)
  const [regime] = useState<ConsentRegime>(inferRegime)
  // Opened from the footer to review or withdraw a decision already made.
  const [reopened, setReopened] = useState(false)

  const decide = useCallback(
    (analytics: boolean) => {
      const next: ConsentChoice = {
        analytics,
        decidedAt: new Date().toISOString(),
        version: CONSENT_VERSION,
        regime,
      }
      try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(next))
      } catch {
        /* storage blocked — the choice still applies for this page view */
      }
      gtagUpdate(analytics)
      if (!analytics) clearAnalyticsCookies()
      setChoice(next)
      setReopened(false)
    },
    [regime],
  )

  /*
   * Under opt-out and notice regimes the visitor is measured from the start
   * (lawful there), so record that implicit state once the banner has been seen.
   * Under opt-in nothing is granted until `decide` runs.
   */
  useEffect(() => {
    if (choice || regime === 'opt-in') return
    if (signalsDeny()) decide(false)
  }, [choice, regime, decide])

  return {
    regime,
    choice,
    /** Banner is due when no valid decision exists, or the user reopened it. */
    open: reopened || !choice,
    reopen: () => setReopened(true),
    dismiss: () => setReopened(false),
    decide,
  }
}
