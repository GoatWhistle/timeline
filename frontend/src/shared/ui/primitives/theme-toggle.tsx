import { Monitor, Moon, Sun } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { ThemePreference } from '@/shared/theme/theme'
import { useTheme } from '@/shared/theme/theme-context'

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

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const { t } = useTranslation()

  return (
    <fieldset
      aria-label={t('theme.legend')}
      className={cn('inline-flex gap-0.5 rounded-md border p-0.5', className)}
    >
      {OPTIONS.map(({ value, labelKey, icon: Icon }) => (
        <label
          key={value}
          title={t(labelKey)}
          className={cn(
            'inline-flex size-7 cursor-pointer items-center justify-center rounded-sm transition-colors duration-instant',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            preference === value
              ? 'bg-accent-surface text-accent-surface-foreground'
              : 'text-muted-foreground hover:bg-accent-surface hover:text-accent-surface-foreground',
          )}
        >
          <input
            type="radio"
            name="theme-preference"
            value={value}
            checked={preference === value}
            onChange={() => setPreference(value)}
            className="sr-only"
          />
          <Icon className="size-4" />
          <span className="sr-only">{t(labelKey)}</span>
        </label>
      ))}
    </fieldset>
  )
}
