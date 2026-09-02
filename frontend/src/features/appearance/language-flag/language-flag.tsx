import type { Locale } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'
import { FLAG_VIEW_BOX, LOCALE_FLAG } from './flag-paths'

export function LanguageFlag({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={FLAG_VIEW_BOX}
      data-flag={locale}
      className={cn(
        'h-4 w-[1.35rem] shrink-0 rounded-[0.1875rem] border border-border/60',
        className,
      )}
    >
      {LOCALE_FLAG[locale].map((path) => (
        <path key={path.d} fill={path.fill} d={path.d} />
      ))}
    </svg>
  )
}
