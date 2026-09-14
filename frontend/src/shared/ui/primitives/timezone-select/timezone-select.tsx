import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { browserTimeZone } from '@/shared/datetime/datetime'
import { useWheelScroll } from '@/shared/hooks/use-wheel-scroll/use-wheel-scroll'
import { cn } from '@/shared/styling/class-names/class-names'
import { Input } from '@/shared/ui/forms/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import {
  cityOf,
  clockIn,
  groupByRegion,
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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const now = useMinuteClock()
  const detected = browserTimeZone()
  const listRef = useWheelScroll<HTMLDivElement>()

  const matching = useMemo(
    () => zoneOptions(value).filter((zone) => matchesQuery(zone, query)),
    [value, query],
  )
  const groups = useMemo(() => groupByRegion(matching), [matching])

  function choose(zone: string) {
    onChange(zone)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-3 rounded-control border border-border bg-surface-1',
          'px-3 py-2 text-left transition-colors duration-instant ease-out',
          'hover:border-border-strong disabled:opacity-50',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-copy">{cityOf(value)}</span>
          <span className="block text-caption text-muted-foreground">
            {regionOf(value)} {offsetOf(value)}
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-copy">{clockIn(value, now)}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground',
            'motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </PopoverTrigger>

      <PopoverContent collisionPadding={12} className="w-72 p-0">
        <div className="relative border-border border-b p-2">
          <Search
            className="-translate-y-1/2 absolute top-1/2 left-4 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={query}
            className="pl-8"
            aria-label={t('timezone.search')}
            placeholder={t('timezone.search')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>

        <div
          ref={listRef}
          className="max-h-[min(14rem,var(--radix-popper-available-height,14rem))] overflow-y-auto py-1"
        >
          {groups.map((group) => (
            <div key={group.region}>
              <p className="px-3 pt-2 pb-1 font-medium text-caption text-muted-foreground">
                {group.region}
              </p>
              {group.zones.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  aria-current={zone === value ? 'true' : undefined}
                  onClick={() => choose(zone)}
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
              ))}
            </div>
          ))}
          {groups.length === 0 ? (
            <p className="px-3 py-2 text-caption text-muted-foreground">
              {t('timezone.nothingFound')}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
