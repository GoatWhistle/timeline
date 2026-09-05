import { useTranslation } from 'react-i18next'
import { useLocale } from '@/shared/i18n/i18n-context'
import { LOCALES } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'
import { OptionCard, OptionMark } from '@/shared/ui/forms/option-card'
import { LanguageFlag } from './language-flag/language-flag'

export function LanguageChoice() {
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()

  return (
    <fieldset
      aria-label={t('language.legend')}
      data-language-choice
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {LOCALES.map((value) => {
        const selected = locale === value
        return (
          <OptionCard
            key={value}
            name="locale-choice"
            value={value}
            selected={selected}
            onSelect={() => setLocale(value)}
            data-language-option={value}
            className="items-center gap-2 px-3 py-2.5"
          >
            <LanguageFlag locale={value} />
            <span className={cn('min-w-0 text-copy', selected && 'font-medium')}>
              {t(`language.${value}`)}
            </span>
            <OptionMark selected={selected} className="ml-auto size-4" />
          </OptionCard>
        )
      })}
    </fieldset>
  )
}
