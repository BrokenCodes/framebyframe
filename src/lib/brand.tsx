import { Fragment, type ReactNode } from 'react'
import { BRAND } from '../content'

/**
 * Google page translation rewrites text nodes, which would translate the product
 * name along with the prose ("FrameByFrame" → "CuadroPorCuadro"). Splitting the
 * string and wrapping each occurrence in a notranslate span keeps the name intact
 * in every language.
 *
 * Use for any body copy that mentions the product.
 */
export function protectBrand(text: string): ReactNode {
  const name = BRAND.name
  const parts = text.split(name)
  if (parts.length === 1) return text

  const nodes: ReactNode[] = []

  parts.forEach((part, i) => {
    if (i > 0) {
      /*
       * Google translates each fragment either side of a notranslate span
       * independently and trims the result, which collapses the spaces around
       * the name ("EsFrameByFrame¿Es realmente…"). Carrying those spaces inside
       * the protected span keeps them verbatim, since Google leaves it alone.
       */
      const lead = /\s$/.test(parts[i - 1]) ? ' ' : ''
      const trail = /^\s/.test(part) ? ' ' : ''
      nodes.push(<NoTranslate key={`brand-${i}`}>{`${lead}${name}${trail}`}</NoTranslate>)
    }

    // Drop the whitespace that moved into the span, so it is not doubled.
    let seg = part
    if (i > 0) seg = seg.replace(/^\s+/, '')
    if (i < parts.length - 1) seg = seg.replace(/\s+$/, '')
    if (seg) nodes.push(<Fragment key={`text-${i}`}>{seg}</Fragment>)
  })

  return nodes
}

/**
 * Marks content as off-limits to machine translation. Google honours both the
 * `notranslate` class and the standard `translate="no"` attribute; we set both so
 * other translators (Edge, Safari, Firefox) respect it too.
 */
export function NoTranslate({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`notranslate ${className}`.trim()} translate="no">
      {children}
    </span>
  )
}
