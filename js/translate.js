/**
 * Google page translation, loaded on click.
 *
 * Click-to-activate is deliberate:
 *  - translating transmits the page's visible text and the visitor's IP to
 *    Google, so under prior-consent law it should not happen unprompted;
 *    clicking *is* the request, which keeps it lawful without its own consent
 *    category;
 *  - it also keeps a third-party script off the critical path for the majority
 *    of visitors, who never change language.
 *
 * No `layout` option is passed on purpose: the default renders a plain
 * <select class="goog-te-combo"> which styles.css restyles. InlineLayout.SIMPLE
 * renders Google's own overlay menu, which cannot be made to fit.
 *
 * This is Google's legacy Website Translator element — functional but no longer
 * actively supported, so it is wired as a progressive enhancement.
 */

const SCRIPT_ID = 'google-translate-script'
const CONTAINER_ID = 'google_translate_element'
const SRC = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'

/** @param {HTMLElement} mount */
export function initTranslate(mount) {
  const label = 'Translate page'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn btn-quiet btn-icon'
  button.title = label
  button.setAttribute('aria-label', label)
  button.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-languages" /></svg>'
  mount.appendChild(button)

  button.addEventListener('click', () => {
    button.remove()

    const container = document.createElement('div')
    container.id = CONTAINER_ID
    container.setAttribute('aria-label', label)
    mount.appendChild(container)

    const init = () => {
      const Element = window.google?.translate?.TranslateElement
      if (!Element) return
      if (container.childElementCount > 0) return
      new Element({ pageLanguage: 'en', autoDisplay: false }, CONTAINER_ID)
    }

    window.googleTranslateElementInit = init

    if (window.google?.translate) return init()
    if (document.getElementById(SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SRC
    script.async = true
    // If it never loads, the page stays fully usable.
    script.onerror = () => container.remove()
    document.head.appendChild(script)
  })
}
