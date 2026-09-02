import { useTranslation } from 'react-i18next'
import { useLocale } from '@/shared/i18n/i18n-context'
import { LOCALES, type Locale } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'

const SHORT: Record<Locale, string> = { ru: 'RU', en: 'EN' }

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()

  return (
    <fieldset
      aria-label={t('language.legend')}
      className={cn('inline-flex gap-0.5 rounded-control border p-0.5', className)}
    >
      {LOCALES.map((value) => (
        <label
          key={value}
          title={t(`language.${value}`)}
          className={cn(
            'inline-flex h-7 cursor-pointer items-center justify-center rounded-badge px-2',
            'font-medium text-caption transition-colors duration-instant',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            locale === value
              ? 'bg-accent-surface text-accent-surface-foreground'
              : 'text-muted-foreground hover:bg-accent-surface hover:text-accent-surface-foreground',
          )}
        >
          <input
            type="radio"
            name="locale-preference"
            value={value}
            checked={locale === value}
            onChange={() => setLocale(value)}
            className="sr-only"
          />
          <span aria-hidden="true">{SHORT[value]}</span>
          <span className="sr-only">{t(`language.${value}`)}</span>
        </label>
      ))}
    </fieldset>
  )
}
