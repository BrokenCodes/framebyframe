import { useCallback, useEffect, useState } from 'react'

/** What the user picked. `system` defers to the OS and keeps following it. */
export type ThemeMode = 'light' | 'dark' | 'system'
/** What is actually painted. */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'framebyframe:theme'
export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** Page background per theme, mirrored into <meta name="theme-color">. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#f2f0ec',
  dark: '#0b0b0d',
}

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return isMode(stored) ? stored : 'system'
  } catch {
    // private mode / blocked storage — fall back to following the OS
    return 'system'
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
}

/**
 * Writes the theme onto <html>. Kept separate from React so the inline bootstrap
 * script in index.html can apply the identical result before first paint —
 * the two must stay in sync or the page flashes the wrong theme.
 */
export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  root.dataset.theme = theme

  // Keep the browser chrome (mobile address bar, PWA) in step.
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((tag) => tag.remove())
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = THEME_COLOR[theme]
  document.head.appendChild(meta)
}

/**
 * Theme controller: three-way mode, live OS following while on `system`, and
 * persistence that survives a reload.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode)
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  // Follow the OS while it can still affect the result.
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY)
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = resolveTheme(mode, prefersDark)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, mode)
    } catch {
      /* non-fatal: the theme just won't persist */
    }
  }, [mode])

  const cycle = useCallback(() => {
    setMode((prev) => THEME_MODES[(THEME_MODES.indexOf(prev) + 1) % THEME_MODES.length])
  }, [])

  return { mode, theme, setMode, cycle }
}
