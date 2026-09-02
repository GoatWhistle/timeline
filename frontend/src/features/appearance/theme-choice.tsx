import { Monitor, Moon, Sun } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { ThemePreference } from '@/shared/theme/theme'
import { useTheme } from '@/shared/theme/theme-context'
import { OptionCard, OptionMark } from '@/shared/ui/forms/option-card'
import { ThemePreview, ThemePreviewSplit } from './theme-preview'

type Option = {
  value: ThemePreference
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}

const OPTIONS: Option[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
]

function previewClass(selected: boolean): string {
  return cn(
    'h-16 w-full motion-safe:transition-transform motion-safe:duration-base',
    'motion-safe:ease-out motion-safe:group-hover:scale-[1.02]',
    selected && 'motion-safe:scale-[1.02]',
  )
}

export function ThemeChoice() {
  const { preference, setPreference } = useTheme()
  const { t } = useTranslation()

  return (
    <fieldset aria-label={t('theme.legend')} className="grid grid-cols-3 gap-3">
      {OPTIONS.map(({ value, labelKey, icon: Icon }) => {
        const selected = preference === value
        return (
          <OptionCard
            key={value}
            name="theme-preference"
            value={value}
            selected={selected}
            onSelect={() => setPreference(value)}
            data-theme-option={value}
            className="flex-col gap-2 p-2"
          >
            {value === 'system' ? (
              <ThemePreviewSplit className={previewClass(selected)} />
            ) : (
              <ThemePreview theme={value} className={previewClass(selected)} />
            )}
            <span className="flex items-center gap-1.5 text-caption">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className={cn('truncate', selected ? 'font-medium' : 'text-muted-foreground')}>
                {t(labelKey)}
              </span>
              <OptionMark selected={selected} className="ml-auto size-3.5" />
            </span>
          </OptionCard>
        )
      })}
    </fieldset>
  )
}
