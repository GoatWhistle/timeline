import { Check, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { browserTimeZone } from '@/shared/datetime/datetime'
import { cn } from '@/shared/styling/class-names/class-names'
import { Input } from '@/shared/ui/forms/input'
import {
  cityOf,
  clockIn,
  matchesQuery,
  offsetOf,
  regionOf,
  zoneOptions,
} from './zone-list'

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export function TimezoneSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const now = useMinuteClock()
  const detected = browserTimeZone()

  const options = useMemo(() => zoneOptions(value), [value])
  const shown = useMemo(() => {
    const matching = options.filter((zone) => matchesQuery(zone, query))
    const detectedFirst = matching.filter((zone) => zone === detected)
    return [...detectedFirst, ...matching.filter((zone) => zone !== detected)]
  }, [options, query, detected])

  return (
    <div className="flex w-72 flex-col gap-2">
      <div className="rounded-control border border-border bg-surface-1 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-copy">{cityOf(value)}</span>
          <span className="tabular-nums text-caption text-muted-foreground">
            {clockIn(value, now)}
          </span>
        </div>
        <p className="text-caption text-muted-foreground">
          {regionOf(value)} {offsetOf(value)}
        </p>
      </div>

      <div className="relative">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          disabled={disabled}
          className="pl-8"
          aria-label={t('timezone.search')}
          placeholder={t('timezone.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ul
        aria-label={t('timezone.legend')}
        className="max-h-56 overflow-y-auto rounded-control border border-border"
      >
        {shown.map((zone) => (
          <li key={zone}>
            <button
              type="button"
              disabled={disabled}
              aria-current={zone === value ? 'true' : undefined}
              onClick={() => onChange(zone)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
                'duration-instant ease-out hover:bg-accent-surface',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                zone === value && 'bg-accent-surface',
              )}
            >
              <Check
                className={cn('size-4 shrink-0', zone !== value && 'invisible')}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-copy">{cityOf(zone)}</span>
              {zone === detected ? (
                <span className="shrink-0 text-caption text-muted-foreground">
                  {t('timezone.detected')}
                </span>
              ) : null}
              <span className="shrink-0 tabular-nums text-caption text-muted-foreground">
                {clockIn(zone, now)}
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 ? (
          <li className="px-3 py-2 text-caption text-muted-foreground">
            {t('timezone.nothingFound')}
          </li>
        ) : null}
      </ul>
    </div>
  )
}
