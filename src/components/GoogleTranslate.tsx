import { useEffect, useRef, useState } from 'react'
import { Languages } from 'lucide-react'

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (options: Record<string, unknown>, containerId: string) => unknown
      }
    }
    googleTranslateElementInit?: () => void
  }
}

const SCRIPT_ID = 'google-translate-script'
const CONTAINER_ID = 'google_translate_element'
const SRC = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'

/**
 * Google page translation. Gives readers any language Google supports, including
 * the long-form English body copy.
 *
 * Loaded on click rather than on page load, deliberately:
 *
 *  - translating transmits the page's visible text and the visitor's IP to
 *    Google, so under prior-consent law (GDPR et al.) it should not happen
 *    unprompted. Clicking *is* the request, which keeps it lawful without
 *    needing its own consent category;
 *  - it also keeps a third-party script off the critical path for the majority
 *    of visitors, who never change language.
 *
 * Mount exactly once — the widget is keyed to a single container id.
 *
 * Note: this is Google's legacy Website Translator element — functional, but no
 * longer an actively supported product, hence the failure path below.
 */
export function GoogleTranslate({ label }: { label: string }) {
  const [active, setActive] = useState(false)
  const [failed, setFailed] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    if (!active || mounted.current) return
    mounted.current = true

    const init = () => {
      const container = document.getElementById(CONTAINER_ID)
      // Already populated (e.g. StrictMode's second pass) — don't double-init.
      if (!container || container.childElementCount > 0) return
      const Element = window.google?.translate?.TranslateElement
      if (!Element) return setFailed(true)
      /*
       * No `layout` option on purpose: the default renders a plain
       * <select class="goog-te-combo">, which index.css restyles. SIMPLE renders
       * Google's own overlay menu, which cannot be made to fit.
       */
      new Element({ pageLanguage: 'en', autoDisplay: false }, CONTAINER_ID)
    }

    window.googleTranslateElementInit = init

    // Script already present from an earlier activation — initialise directly.
    if (window.google?.translate) return init()

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SRC
    script.async = true
    script.onerror = () => setFailed(true)
    document.head.appendChild(script)
  }, [active])

  if (failed) return null

  // Before activation: a button, so no Google request has been made yet.
  if (!active) {
    return (
      <button
        type="button"
        className="btn btn-quiet btn-icon"
        onClick={() => setActive(true)}
        aria-label={label}
        title={label}
      >
        <Languages size={17} />
      </button>
    )
  }

  return (
    <div className="gt-wrap" title={label}>
      {/* Google replaces the contents of this node. */}
      <div id={CONTAINER_ID} aria-label={label} />
    </div>
  )
}
