import { AtSign, Link2, Mail } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

export type InviteMode = 'nickname' | 'email' | 'link'

const MODES: {
  value: InviteMode
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'nickname', labelKey: 'inviteByNickname', icon: AtSign },
  { value: 'email', labelKey: 'inviteByEmail', icon: Mail },
  { value: 'link', labelKey: 'inviteByLink', icon: Link2 },
]

export function InviteModeTabs({
  value,
  onChange,
}: {
  value: InviteMode
  onChange: (value: InviteMode) => void
}) {
  const { t } = useTranslation('team')

  return (
    <div role="tablist" className="flex gap-1 rounded-md bg-surface-2 p-1">
      {MODES.map(({ value: mode, labelKey, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-caption',
            'motion-safe:transition-colors motion-safe:duration-instant motion-safe:ease-out',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
            value === mode
              ? 'bg-background font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
