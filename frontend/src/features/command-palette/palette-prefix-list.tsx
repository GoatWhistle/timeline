import { useTranslation } from 'react-i18next'

const PREFIX_ROWS = [
  { symbol: '#', key: 'palette.help.prefixHackathons' },
  { symbol: '@', key: 'palette.help.prefixMeetups' },
  { symbol: '*', key: 'palette.help.prefixEvents' },
  { symbol: '>', key: 'palette.help.prefixCommands' },
  { symbol: '/', key: 'palette.help.prefixPages' },
  { symbol: '~', key: 'palette.help.prefixTeams' },
  { symbol: '!', key: 'palette.help.prefixAdmin' },
] as const

export function PalettePrefixList({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <dl className={className}>
      {PREFIX_ROWS.map(({ symbol, key }) => (
        <div key={symbol} className="flex items-baseline gap-3">
          <dt className="w-6 shrink-0 rounded-badge bg-surface-2 px-1.5 py-0.5 text-center font-mono text-caption">
            {symbol}
          </dt>
          <dd className="min-w-0 text-caption text-muted-foreground">{t(key)}</dd>
        </div>
      ))}
    </dl>
  )
}
