import { useTranslation } from 'react-i18next'

const PREFIX_ROWS = [
  { symbol: '#', mode: 'hackathons', key: 'palette.help.prefixHackathons' },
  { symbol: '@', mode: 'meetups', key: 'palette.help.prefixMeetups' },
  { symbol: '*', mode: 'events', key: 'palette.help.prefixEvents' },
  { symbol: '>', mode: 'commands', key: 'palette.help.prefixCommands' },
  { symbol: '/', mode: 'pages', key: 'palette.help.prefixPages' },
  { symbol: '~', mode: 'teams', key: 'palette.help.prefixTeams' },
  { symbol: '!', mode: 'admin', key: 'palette.help.prefixAdmin' },
] as const

export function PalettePrefixList({
  className,
  isAdmin,
}: {
  className?: string
  isAdmin: boolean
}) {
  const { t } = useTranslation()
  const rows = PREFIX_ROWS.filter((row) => row.mode !== 'admin' || isAdmin)

  return (
    <dl className={className}>
      {rows.map(({ symbol, key }) => (
        <div key={symbol} className="flex items-baseline gap-3">
          <dt
            data-palette-prefix-row={symbol}
            className="w-6 shrink-0 rounded-badge bg-surface-2 px-1.5 py-0.5 text-center font-mono text-caption"
          >
            {symbol}
          </dt>
          <dd className="min-w-0 text-caption text-muted-foreground">{t(key)}</dd>
        </div>
      ))}
    </dl>
  )
}
