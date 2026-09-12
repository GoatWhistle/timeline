import { Globe } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageFlag } from '@/features/appearance/language-flag/language-flag'
import { useLocale } from '@/shared/i18n/i18n-context'
import { LOCALES } from '@/shared/i18n/locale'
import { cn } from '@/shared/styling/class-names/class-names'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

const LANGUAGE_ITEM = cn(
  'relative z-10 flex items-center gap-2 rounded-control px-2 py-1.5 text-copy',
  'transition-colors duration-base ease-out',
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
)

export function AuthLanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(locale, 'y', open)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('language.label')}
          className={className}
        >
          <Globe className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-44">
        <nav
          aria-label={t('language.legend')}
          ref={containerRef}
          className="relative flex flex-col gap-0.5"
        >
          <SlidingIndicator box={box} axis="y" />
          {LOCALES.map((value) => {
            const selected = locale === value
            return (
              <button
                key={value}
                type="button"
                aria-current={selected ? 'true' : undefined}
                data-indicator-item
                data-indicator-active={selected ? 'true' : undefined}
                onClick={() => setLocale(value)}
                className={cn(
                  LANGUAGE_ITEM,
                  selected
                    ? 'font-medium text-accent-surface-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LanguageFlag locale={value} />
                <span className="min-w-0 truncate">{t(`language.${value}`)}</span>
              </button>
            )
          })}
        </nav>
      </PopoverContent>
    </Popover>
  )
}
