/**
 * Consent for Google Consent Mode v2.
 *
 * The defaults are declared inline in index.html *before* gtag.js — that is the
 * compliance-critical half. This module owns the UI-facing half: which regime a
 * visitor falls under, what they chose, and pushing updates.
 *
 * Only `analytics` is offered because that is all the site uses. Advertising
 * signals are never granted.
 */

export const CONSENT_KEY = 'framebyframe:consent'
/** Bump when the categories change; invalidates older decisions. */
export const CONSENT_VERSION = 1

/**
 * How consent must be obtained:
 *  - `opt-in`  nothing non-essential until an affirmative choice (GDPR/UK/CH, …)
 *  - `opt-out` measurement permitted, but a clear opt-out must be offered (US)
 *  - `notice`  measurement permitted, disclosure plus an easy way to turn it off
 * @typedef {'opt-in'|'opt-out'|'notice'} ConsentRegime
 */

/** Global Privacy Control / Do Not Track — honoured everywhere, not only where binding. */
export function signalsDeny() {
  return (
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1' ||
    window.doNotTrack === '1'
  )
}

/**
 * Timezone-based region hint. Deliberately network-free: an IP geolocation
 * lookup would itself transmit the visitor's address before they consented.
 *
 * It is coarse and **fails safe** — an unreadable timezone, or anything
 * Europe-adjacent, is treated as opt-in. Google separately enforces the
 * region-scoped defaults against the real IP, so a wrong guess here changes only
 * which banner is shown, never whether an EEA visitor may be measured.
 * @returns {ConsentRegime}
 */
export function inferRegime() {
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

  // US and Canada: state privacy laws are opt-out with a mandatory
  // "do not sell/share" style control.
  if (/^America\//.test(tz) || /^(US|Canada|Pacific\/Honolulu)/.test(tz)) return 'opt-out'

  return 'notice'
}

export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.analytics !== 'boolean') return null
    // A stale version means the categories changed — ask again.
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function gtagUpdate(analytics) {
  if (typeof window.gtag !== 'function') return
  window.gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    functionality_storage: analytics ? 'granted' : 'denied',
    // Never granted: this site serves no advertising.
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

/**
 * Best-effort removal of GA's cookies when consent is withdrawn. Consent Mode
 * stops collection on its own, but leaving `_ga*` behind after a refusal reads
 * like the refusal did nothing.
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

/**
 * Wires the consent banner.
 *
 * Under `opt-in` the prompt is blocking, Accept and Reject carry equal visual
 * weight, and Escape cannot bypass it — refusing must be exactly as easy as
 * accepting. Under the other regimes it is a dismissible notice.
 *
 * @returns {{reopen: () => void}}
 */
export function initConsent(els) {
  const regime = inferRegime()
  let choice = readConsent()

  const blocking = () => regime === 'opt-in' && !choice

  const render = (open) => {
    els.banner.hidden = !open
    els.scrim.hidden = !open || !blocking()
    els.banner.setAttribute('aria-modal', String(blocking()))

    els.heading.textContent = blocking()
      ? 'Before we measure anything'
      : 'How this site measures traffic'
    els.tail.textContent =
      regime === 'opt-in'
        ? 'Nothing is loaded until you choose.'
        : 'You can turn it off at any time.'
    els.rejectLabel.textContent =
      regime === 'opt-in' ? 'Reject analytics' : 'Opt out of analytics'

    // Only offer Close once a decision exists.
    els.close.hidden = !choice
    els.state.hidden = !choice
    if (choice) {
      els.state.textContent = `Currently ${choice.analytics ? 'accepted' : 'declined'}`
    }
  }

  const decide = (analytics) => {
    choice = {
      analytics,
      decidedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
      regime,
    }
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(choice))
    } catch {
      /* storage blocked — the choice still applies for this page view */
    }
    gtagUpdate(analytics)
    if (!analytics) clearAnalyticsCookies()
    render(false)
  }

  els.accept.addEventListener('click', () => decide(true))
  els.reject.addEventListener('click', () => decide(false))
  els.close.addEventListener('click', () => render(false))

  els.detailsToggle.addEventListener('click', () => {
    const open = els.detail.hidden
    els.detail.hidden = !open
    els.detailsToggle.setAttribute('aria-expanded', String(open))
    els.detailsToggle.textContent = open ? 'Hide details' : 'What gets stored'
  })

  document.addEventListener('keydown', (e) => {
    // A blocking prompt must not be dismissible without choosing.
    if (e.key === 'Escape' && !blocking() && !els.banner.hidden) render(false)
  })

  /*
   * Under opt-out and notice the visitor is measured from the start (lawful
   * there), so record that state if a privacy signal says otherwise.
   * Under opt-in nothing is granted until `decide` runs.
   */
  if (!choice && regime !== 'opt-in' && signalsDeny()) decide(false)
  else render(!choice)

  return { reopen: () => render(true) }
}
