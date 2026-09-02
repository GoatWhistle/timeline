import { Check, Monitor, Moon, Sun } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { ResolvedTheme, ThemePreference } from '@/shared/theme/theme'
import { useTheme } from '@/shared/theme/theme-context'
import { ThemePreview } from './theme-preview'

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

function previewFor(value: ThemePreference, system: ResolvedTheme): ResolvedTheme {
  return value === 'system' ? system : value
}

export function ThemeChoice() {
  const { preference, resolved, setPreference, systemTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <fieldset aria-label={t('theme.legend')} className="grid grid-cols-3 gap-3">
      {OPTIONS.map(({ value, labelKey, icon: Icon }) => {
        const selected = preference === value
        return (
          <label
            key={value}
            data-theme-option={value}
            data-selected={selected ? 'true' : undefined}
            className={cn(
              'group flex cursor-pointer flex-col gap-2 rounded-surface border p-2',
              'transition-colors duration-base ease-out',
              'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
              selected
                ? 'border-primary bg-accent-surface'
                : 'border-border hover:border-border-strong',
            )}
          >
            <ThemePreview
              theme={previewFor(value, systemTheme)}
              className={cn(
                'h-16 w-full motion-safe:transition-transform motion-safe:duration-base',
                'motion-safe:ease-out motion-safe:group-hover:scale-[1.02]',
                selected && 'motion-safe:scale-[1.02]',
              )}
            />
            <span className="flex items-center gap-1.5 text-caption">
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className={cn('truncate', selected ? 'font-medium' : 'text-muted-foreground')}>
                {t(labelKey)}
              </span>
              <Check
                aria-hidden="true"
                className={cn(
                  'ml-auto size-3.5 shrink-0 text-primary transition-opacity duration-base ease-out',
                  selected ? 'opacity-100' : 'opacity-0',
                )}
              />
            </span>
            <input
              type="radio"
              name="theme-preference"
              value={value}
              checked={selected}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
          </label>
        )
      })}
      <p className="col-span-3 text-meta text-muted-foreground" data-theme-resolved={resolved}>
        {t(resolved === 'dark' ? 'theme.activeDark' : 'theme.activeLight')}
      </p>
    </fieldset>
  )
}
