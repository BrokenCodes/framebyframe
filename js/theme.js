/**
 * Three-way theme control: light / dark / system.
 *
 * `system` is a real, persisted choice rather than just the initial default, so
 * someone who has toggled manually can hand control back to the OS — and while
 * on `system` the page follows live prefers-color-scheme changes.
 */

export const THEME_KEY = 'framebyframe:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Page background per theme, mirrored into <meta name="theme-color">. */
const THEME_COLOR = { light: '#f2f0ec', dark: '#0b0b0d' }

const isMode = (v) => v === 'light' || v === 'dark' || v === 'system'

export function readStoredMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return isMode(stored) ? stored : 'system'
  } catch {
    // Private mode / blocked storage — follow the OS.
    return 'system'
  }
}

export const systemPrefersDark = () => !!window.matchMedia?.(DARK_QUERY).matches

export const resolveTheme = (mode, prefersDark) =>
  mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode

/**
 * Writes the theme onto <html>. Must produce the same result as the inline
 * bootstrap in index.html — keep the two in sync or the page flashes.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  root.dataset.theme = theme

  // Keep browser chrome (mobile address bar, installed PWA) in step.
  document.querySelectorAll('meta[name="theme-color"]').forEach((tag) => tag.remove())
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = THEME_COLOR[theme]
  document.head.appendChild(meta)
}

/**
 * Wires the header theme menu.
 * @param {{button: HTMLElement, panel: HTMLElement, icon: SVGElement}} els
 */
export function initTheme({ button, panel, icon }) {
  let mode = readStoredMode()
  let prefersDark = systemPrefersDark()

  const iconFor = (m) => (m === 'system' ? (prefersDark ? 'moon' : 'sun') : m === 'dark' ? 'moon' : 'sun')

  const render = () => {
    const theme = resolveTheme(mode, prefersDark)
    applyTheme(theme)
    // Show what is actually painted when following the system.
    icon.querySelector('use').setAttribute('href', `#i-${iconFor(mode)}`)
    const label = mode.charAt(0).toUpperCase() + mode.slice(1)
    button.setAttribute('aria-label', `Theme: ${label}`)
    panel.querySelectorAll('[data-mode]').forEach((item) => {
      item.setAttribute('aria-selected', String(item.dataset.mode === mode))
    })
  }

  const setMode = (next) => {
    mode = next
    try {
      localStorage.setItem(THEME_KEY, mode)
    } catch {
      /* non-fatal: the theme just won't persist */
    }
    render()
  }

  // Follow the OS while it can still affect the result.
  window.matchMedia?.(DARK_QUERY).addEventListener('change', (e) => {
    prefersDark = e.matches
    render()
  })

  const close = () => {
    panel.hidden = true
    button.setAttribute('aria-expanded', 'false')
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = panel.hidden
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
  })

  panel.querySelectorAll('[data-mode]').forEach((item) => {
    item.addEventListener('click', () => {
      setMode(item.dataset.mode)
      close()
    })
  })

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== button) close()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })

  render()
}
