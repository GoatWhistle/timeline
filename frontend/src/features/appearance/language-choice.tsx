import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/shared/i18n/i18n-context'
import { LOCALES, type Locale } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'

const CODE: Record<Locale, string> = { ru: 'RU', en: 'EN' }

export function LanguageChoice() {
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()

  return (
    <fieldset aria-label={t('language.legend')} className="grid grid-cols-2 gap-3">
      {LOCALES.map((value) => {
        const selected = locale === value
        return (
          <label
            key={value}
            data-language-option={value}
            data-selected={selected ? 'true' : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-surface border px-3 py-2.5',
              'transition-colors duration-base ease-out',
              'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
              selected
                ? 'border-primary bg-accent-surface'
                : 'border-border hover:border-border-strong',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'shrink-0 rounded-badge px-1.5 py-0.5 font-medium font-mono text-caption',
                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {CODE[value]}
            </span>
            <span className={cn('min-w-0 truncate text-copy', selected && 'font-medium')}>
              {t(`language.${value}`)}
            </span>
            <Check
              aria-hidden="true"
              className={cn(
                'ml-auto size-4 shrink-0 text-primary transition-opacity duration-base ease-out',
                selected ? 'opacity-100' : 'opacity-0',
              )}
            />
            <input
              type="radio"
              name="locale-choice"
              value={value}
              checked={selected}
              onChange={() => setLocale(value)}
              className="sr-only"
            />
          </label>
        )
      })}
    </fieldset>
  )
}
