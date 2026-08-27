import { Monitor, Moon, Sun } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import type { ThemePreference } from '@/shared/theme/theme'
import { useTheme } from '@/shared/theme/theme-context'

type Option = {
  value: ThemePreference
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Светлая тема', icon: Sun },
  { value: 'dark', label: 'Тёмная тема', icon: Moon },
  { value: 'system', label: 'Системная тема', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()

  return (
    <fieldset
      aria-label="Оформление"
      className={cn('inline-flex gap-0.5 rounded-md border p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          title={label}
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
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}
