import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import type { PaletteMode } from './palette-prefix'

const HINTS = [
  { symbol: '#', mode: 'hackathons', key: 'palette.help.labelHackathons' },
  { symbol: '@', mode: 'meetups', key: 'palette.help.labelMeetups' },
  { symbol: '>', mode: 'commands', key: 'palette.help.labelCommands' },
  { symbol: '/', mode: 'pages', key: 'palette.help.labelPages' },
  { symbol: '~', mode: 'teams', key: 'palette.help.labelTeams' },
] as const

const REST = [
  { symbol: '*', mode: 'events', key: 'palette.help.labelEvents' },
  { symbol: '!', mode: 'admin', key: 'palette.help.labelAdmin' },
] as const

export function PaletteHintBar({ mode, isAdmin }: { mode: PaletteMode; isAdmin: boolean }) {
  const { t } = useTranslation()
  const reachable = REST.filter((hint) => hint.mode !== 'admin' || isAdmin)
  const pinned = reachable.find((hint) => hint.mode === mode)
  const shown = pinned ? [...HINTS.slice(0, 4), pinned] : HINTS

  return (
    <div
      data-palette-hints
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-border border-t px-4 py-2"
    >
      {shown.map((hint) => {
        const active = hint.mode === mode
        return (
          <span key={hint.symbol} className="flex items-baseline gap-1.5">
            <kbd
              data-palette-hint-key={hint.symbol}
              data-active={active ? 'true' : undefined}
              className={cn(
                'rounded-badge px-1.5 py-0.5 font-mono text-caption transition-colors duration-instant',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-2 text-muted-foreground',
              )}
            >
              {hint.symbol}
            </kbd>
            <span
              className={cn(
                'text-caption transition-colors duration-instant',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {t(hint.key)}
            </span>
          </span>
        )
      })}
      <span className="ml-auto flex items-baseline gap-1.5">
        <kbd className="rounded-badge bg-surface-2 px-1.5 py-0.5 font-mono text-caption text-muted-foreground">
          ?
        </kbd>
        <span className="text-caption text-muted-foreground">{t('palette.help.more')}</span>
      </span>
    </div>
  )
}
