import { cloneElement, useId, useState, type ReactElement } from 'react'

interface Props {
  label: string
  children: ReactElement<{ 'aria-describedby'?: string }>
  side?: 'top' | 'bottom'
}

/**
 * Lightweight tooltip that also wires up aria-describedby, so shortcut hints are
 * available to screen readers rather than being hover-only decoration.
 */
export function Tip({ label, children, side = 'top' }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute start-1/2 z-50 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-opacity duration-100"
        style={{
          [side === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          background: 'var(--invert-bg)',
          color: 'var(--invert-fg)',
          border: '1px solid var(--invert-line)',
        }}
      >
        {label}
      </span>
    </span>
  )
}
