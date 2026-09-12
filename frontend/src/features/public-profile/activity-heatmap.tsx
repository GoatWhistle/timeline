import { useTranslation } from 'react-i18next'
import type { MonthlyActivity } from '@/shared/api/types.gen'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/overlays/tooltip'
import { activityLevel, maxMonthlyCount } from './activity-level'

const LEVEL_CLASS: Record<0 | 1 | 2 | 3, string> = {
  0: 'bg-[var(--activity-0)]',
  1: 'bg-[var(--activity-1)]',
  2: 'bg-[var(--activity-2)]',
  3: 'bg-[var(--activity-3)]',
}

function monthLabel(month: string, locale: string): string {
  const [year, monthNumber] = month.split('-')
  if (!year || !monthNumber) return month
  const date = new Date(Number(year), Number(monthNumber) - 1, 1)
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(date)
}

function ActivityCell({
  entry,
  level,
  locale,
}: {
  entry: MonthlyActivity
  level: 0 | 1 | 2 | 3
  locale: string
}) {
  const { t } = useTranslation()
  const label = monthLabel(entry.month, locale)
  const count = t('publicProfile.activity.eventCount', { count: entry.count })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-activity-cell
          data-level={level}
          aria-label={`${label}: ${count}`}
          className={cn(
            'size-4 shrink-0 rounded-[3px] outline-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            LEVEL_CLASS[level],
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{count}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function ActivityHeatmap({ months }: { months: MonthlyActivity[] }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const max = maxMonthlyCount(months.map((entry) => entry.count))

  return (
    <section aria-label={t('publicProfile.activity.title')} className="flex flex-col gap-3">
      <h2 className="font-semibold text-copy">{t('publicProfile.activity.title')}</h2>
      <TooltipProvider>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-1.5">
            {months.map((entry) => (
              <ActivityCell
                key={entry.month}
                entry={entry}
                level={activityLevel(entry.count, max)}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </TooltipProvider>
      <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <span>{t('publicProfile.activity.less')}</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className={cn('size-3 rounded-[2px]', LEVEL_CLASS[level])}
          />
        ))}
        <span>{t('publicProfile.activity.more')}</span>
      </div>
    </section>
  )
}
