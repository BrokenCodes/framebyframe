import { BRAND, FOOTER } from '../content'
import { useI18n } from '../i18n'
import { Wordmark } from './SiteHeader'
import { NoTranslate, protectBrand } from '../lib/brand'

interface Props {
  onShowShortcuts: () => void
  /** GDPR requires withdrawing consent to be as easy as giving it. */
  onShowPrivacyChoices: () => void
}

export function SiteFooter({ onShowShortcuts, onShowPrivacyChoices }: Props) {
  const { t } = useI18n()

  return (
    <footer className="band band-alt" style={{ background: 'var(--paper)' }}>
      <div className="rule" />
      <div className="shell py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16">
          <div>
            <Wordmark className="text-xl" />
            <p className="prose-body mt-5 max-w-sm text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
              {protectBrand(FOOTER.blurb)}
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            {FOOTER.columns.map((col) => (
              <div key={col.title}>
                <h2
                  className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {col.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {/* The shortcuts panel is a dialog, not a section — open it instead of jumping. */}
                      {link.href === '#shortcuts' || link.href === '#privacy-choices' ? (
                        <button
                          type="button"
                          onClick={
                            link.href === '#shortcuts' ? onShowShortcuts : onShowPrivacyChoices
                          }
                          className="text-start text-sm transition-colors"
                          style={{ color: 'var(--ink-2)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-text)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
                        >
                          {link.label}
                        </button>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm transition-colors"
                          style={{ color: 'var(--ink-2)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-text)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="rule mt-14" />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {t('footer')}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>
            © {new Date().getFullYear()} <NoTranslate>{BRAND.name}</NoTranslate>
          </p>
        </div>
      </div>
    </footer>
  )
}
