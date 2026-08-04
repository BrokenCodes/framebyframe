import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export function ShortcutsDialog({ open, onClose }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const rows: [string, string][] = [
    ['Space / K', t('scPlay')],
    [', / .', t('scStep')],
    ['← / →', t('scSecond')],
    ['C', t('scCapture')],
    ['I / O', t('scIn')],
    ['Enter', t('scExtract')],
    ['⌘/Ctrl + A', t('scSelectAll')],
    ['?', t('scHelp')],
    ['Esc', t('scClose')],
  ]

  return (
    <div
      id="shortcuts"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'var(--scrim)' }}
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts')}
        className="band rise w-full max-w-lg"
        style={{ background: 'var(--paper)', border: '1px solid var(--line-strong)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span className="numeral">04</span>
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--ink)' }}
          >
            {t('shortcuts')}
          </h2>
          <button className="btn btn-quiet btn-icon ms-auto" onClick={onClose} aria-label={t('scClose')}>
            <X size={18} />
          </button>
        </div>

        <dl className="px-5 py-2">
          {rows.map(([keys, desc]) => (
            <div
              key={keys}
              className="flex items-center justify-between gap-6 py-3"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <dd className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {desc}
              </dd>
              <dt
                className="shrink-0 px-2 py-1 font-mono text-[11px]"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--ink)' }}
              >
                {keys}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
