import { flagSource } from '@/shared/geo/flag'
import type { Locale } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'

const LOCALE_COUNTRY: Record<Locale, string> = {
  ru: 'ru',
  en: 'gb',
}

export function LanguageFlag({ locale, className }: { locale: Locale; className?: string }) {
  const source = flagSource(LOCALE_COUNTRY[locale])
  if (!source) return null

  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      decoding="async"
      data-flag={locale}
      data-flag-country={LOCALE_COUNTRY[locale]}
      className={cn(
        'h-4 w-[1.35rem] shrink-0 rounded-[0.1875rem] border border-border/60 object-cover',
        className,
      )}
    />
  )
}
