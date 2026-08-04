import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Keyboard, Menu, Monitor, Moon, Sun, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { BRAND, NAV } from '../content'
import type { ResolvedTheme, ThemeMode } from '../lib/theme'
import { GoogleTranslate } from './GoogleTranslate'

interface Props {
  themeMode: ThemeMode
  theme: ResolvedTheme
  onThemeModeChange: (mode: ThemeMode) => void
  onShowShortcuts: () => void
  /** Transparent over the hero until the user scrolls away from the top. */
  atPageTop: boolean
}

export function SiteHeader({
  themeMode,
  theme,
  onThemeModeChange,
  onShowShortcuts,
  atPageTop,
}: Props) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      {/*
        The header inherits the page theme in both states — only its backdrop
        changes on scroll, so contrast never depends on what is behind it.
      */}
      <header
        className="band fixed inset-x-0 top-0 z-50 transition-colors duration-300"
        style={{
          background: atPageTop && !menuOpen ? 'transparent' : 'var(--paper)',
          borderBottom: `1px solid ${atPageTop && !menuOpen ? 'transparent' : 'var(--line)'}`,
          color: 'var(--ink)',
          backdropFilter: atPageTop && !menuOpen ? undefined : 'blur(8px)',
        }}
      >
        <div className="shell flex h-16 items-center gap-4 lg:h-20">
          <a href="#top" className="flex items-center gap-3" aria-label={`${BRAND.name} — home`}>
            <Wordmark className="text-lg lg:text-xl" />
            <span aria-hidden="true" className="h-5 w-px" style={{ background: 'var(--accent)' }} />
            {/* Hidden until xl: the translate control needs the horizontal room. */}
            <span
              className="hidden text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] xl:block"
              style={{ color: 'var(--ink-3)' }}
            >
              {BRAND.descriptor[0]}
              <br />
              {BRAND.descriptor[1]}
            </span>
          </a>

          <nav className="ms-auto hidden items-center gap-7 lg:flex" aria-label="Sections">
            {NAV.slice(0, 5).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors"
                style={{ color: 'var(--ink-2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1 lg:ms-4">
            <button
              className="btn btn-quiet btn-icon"
              onClick={onShowShortcuts}
              aria-label={t('shortcuts')}
              title={t('shortcuts')}
            >
              <Keyboard size={17} />
            </button>
            <ThemeMenu mode={themeMode} theme={theme} onChange={onThemeModeChange} />
            {/*
              Whole-page translation, covering the long-form English body copy.
              Mounted exactly once here — the widget owns a single container id,
              so a second instance would duplicate that id in the DOM.
            */}
            <GoogleTranslate label={t('translatePage')} />
            <button
              className="btn btn-quiet btn-icon lg:ms-1"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <NavOverlay onClose={() => setMenuOpen(false)} />}
    </>
  )
}

function NavOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="band fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--paper)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <div className="shell flex h-16 items-center lg:h-20">
        <Wordmark className="text-lg lg:text-xl" />
        <button className="btn btn-quiet btn-icon ms-auto" onClick={onClose} aria-label="Close menu">
          <X size={24} />
        </button>
      </div>

      <div className="rule" />

      <nav className="shell py-8 lg:py-14">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex items-center gap-5 border-b py-5 lg:gap-8 lg:py-7"
            style={{ borderColor: 'var(--line)' }}
          >
            <span className="numeral">{item.num}</span>
            <span
              className="display-3 transition-transform duration-200 group-hover:translate-x-2"
              style={{ color: 'var(--ink)' }}
            >
              {item.label}
            </span>
            <ArrowRight
              size={22}
              className="ms-auto opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: 'var(--accent-text)' }}
            />
          </a>
        ))}

        <a href="#extractor" onClick={onClose} className="btn btn-accent mt-10 w-full justify-between px-6 py-5">
          <span>Open the extractor</span>
          <ArrowRight size={18} />
        </a>
      </nav>
    </div>
  )
}

/** FRAME·BY·FRAME with the middle word carrying the accent colour. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    // notranslate + translate="no" so page translation never renames the product.
    <span
      className={`notranslate font-display font-bold tracking-tight ${className}`}
      translate="no"
      style={{ color: 'var(--ink)' }}
    >
      {BRAND.wordmark}
      <span style={{ color: 'var(--accent-text)' }}>{BRAND.wordmarkAccent}</span>
      {BRAND.wordmarkTail}
    </span>
  )
}

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const

/**
 * Three-way theme control. `System` is a real option rather than just the initial
 * default, so a user who has toggled manually can hand control back to the OS.
 */
function ThemeMenu({
  mode,
  theme,
  onChange,
}: {
  mode: ThemeMode
  theme: ResolvedTheme
  onChange: (m: ThemeMode) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const options: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
    { value: 'system', label: t('themeSystem') },
  ]

  // Show what's actually painted when following the system.
  const Icon = THEME_ICON[mode === 'system' ? theme : mode]

  return (
    <div ref={wrapRef} className="relative">
      <button
        className="btn btn-quiet btn-icon"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('theme')}: ${options.find((o) => o.value === mode)?.label}`}
        title={t('theme')}
      >
        <Icon size={17} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('theme')}
          className="card absolute end-0 top-full z-50 mt-2 w-40"
          style={{ background: 'var(--paper-2)' }}
        >
          {options.map((opt) => {
            const OptIcon = THEME_ICON[opt.value]
            const active = opt.value === mode
            return (
              <li key={opt.value}>
                <button
                  role="option"
                  aria-selected={active}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm transition-colors"
                  style={{
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    background: active ? 'var(--paper-3)' : undefined,
                  }}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <OptIcon size={14} />
                  {opt.label}
                  {active && (
                    <Check size={14} className="ms-auto" style={{ color: 'var(--accent-text)' }} />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

