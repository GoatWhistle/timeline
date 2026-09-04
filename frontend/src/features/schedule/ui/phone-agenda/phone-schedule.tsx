import { format, startOfMonth } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScheduleResponse, ScheduleRow as ScheduleRowData } from '@/shared/api/types.gen'
import { formatDate, formatRelative } from '@/shared/datetime/datetime'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locale'
import { buildCalendarSpans, type CalendarSpan } from '../../model/calendar-items'
import { buildMonthBlocks, dayKey } from '../../model/month-grid'
import { DAYS_PER_WEEK } from '../../model/pack-lanes'
import { agendaMonths, spansOfDay } from '../../model/phone-agenda'
import { rowSentence } from '../../model/row-sentence'
import { buildTimelineGrid } from '../../model/timeline-grid'
import { useAnnouncer } from '../../model/use-announcer'
import { useWrappedFocus } from '../../model/use-wrapped-focus'
import { PhoneMonth } from '../phone-month/phone-month'
import { AgendaMonths } from './agenda-months'
import { AgendaRow } from './agenda-row'
import styles from './phone-agenda.module.css'

const DATE_FNS_LOCALES = { ru, en: enUS }

export type PhoneScheduleProps = {
  data: ScheduleResponse
  from: Date
  months: number
  selectedId?: string
  now?: Date
  onSelect?: (id: string | undefined) => void
  onOpenEvent?: (row: ScheduleRowData) => void
}

export function PhoneSchedule({
  data,
  from,
  months,
  selectedId,
  now = new Date(),
  onSelect,
  onOpenEvent,
}: PhoneScheduleProps) {
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const { message, announce } = useAnnouncer()
  const [pickedKey, setPickedKey] = useState<string | undefined>(undefined)

  const language = i18n.language?.split('-')[0]
  const locale = DATE_FNS_LOCALES[isLocale(language) ? language : DEFAULT_LOCALE]

  const singleMonth = months === 1
  const blocks = useMemo(() => buildMonthBlocks(from, months), [from, months])

  const bounds = useMemo(() => {
    const first = blocks[0]?.weeks[0]?.days[0]?.date ?? startOfMonth(from)
    const weeks = blocks[blocks.length - 1]?.weeks
    const last = weeks?.[weeks.length - 1]?.days[DAYS_PER_WEEK - 1]?.date ?? first
    return { first, last }
  }, [blocks, from])

  const spans = useMemo(
    () => buildCalendarSpans(data, buildTimelineGrid(bounds.first, bounds.last)),
    [data, bounds],
  )

  const sentenceOf = useCallback(
    (span: CalendarSpan) =>
      rowSentence(span.row, span.items, {
        t,
        formatDate: (iso: string) => formatDate(iso),
        formatRemaining: (iso: string) => formatRelative(iso, now),
        now,
      }),
    [t, now],
  )

  const dayLabel = useCallback(
    (date: Date, count: number) => {
      const named = t('schedule.dayAria', {
        date: format(date, 'd LLLL yyyy', { locale }),
        count,
      })
      return count > 0 ? `${named}. ${t('schedule.dayAgendaHint')}` : named
    },
    [t, locale],
  )

  const openById = useCallback(
    (id: string) => {
      const span = spans.find((item) => item.id === id)
      if (!span) return
      announce(sentenceOf(span))
      onOpenEvent?.(span.row)
    },
    [spans, announce, sentenceOf, onOpenEvent],
  )

  const { cursor, setCursor, onDayKeyDown, onBarKeyDown } = useWrappedFocus({
    container: containerRef,
    first: bounds.first,
    last: bounds.last,
    now,
    onClear: () => {
      setPickedKey(undefined)
      onSelect?.(undefined)
    },
    onSelect: (id) => onSelect?.(id),
    onOpen: openById,
  })

  const cursorKey = dayKey(cursor)
  const known = blocks.some((block) =>
    block.weeks.some((week) => week.days.some((day) => day.inMonth && day.key === cursorKey)),
  )
  const fallbackKey = blocks
    .flatMap((block) => block.weeks)
    .flatMap((week) => week.days)
    .find((day) => day.inMonth)?.key

  const pickedDate = useMemo(() => {
    if (!pickedKey) return undefined
    return blocks
      .flatMap((block) => block.weeks)
      .flatMap((week) => week.days)
      .find((day) => day.inMonth && day.key === pickedKey)?.date
  }, [pickedKey, blocks])

  const dayAgenda = useMemo(
    () => (pickedDate ? spansOfDay(spans, pickedDate) : []),
    [pickedDate, spans],
  )

  const sections = useMemo(
    () => (singleMonth ? [] : agendaMonths(spans, from, months)),
    [singleMonth, spans, from, months],
  )

  const pickDay = useCallback(
    (date: Date) => {
      const key = dayKey(date)
      setPickedKey((current) => (current === key ? undefined : key))
      onSelect?.(undefined)
    },
    [onSelect],
  )

  const onCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        const key = dayKey(cursor)
        if (pickedKey !== key) {
          event.preventDefault()
          setPickedKey(key)
          onSelect?.(undefined)
          return
        }
      }
      onDayKeyDown(event)
    },
    [cursor, pickedKey, onSelect, onDayKeyDown],
  )

  return (
    <div
      ref={containerRef}
      className={styles.stack}
      data-schedule-phone
      data-has-selection={selectedId ? 'true' : 'false'}
    >
      {singleMonth &&
        blocks.map((block) => (
          <PhoneMonth
            key={block.key}
            block={block}
            spans={spans}
            locale={locale}
            now={now}
            selectedKey={pickedKey}
            focusedKey={known ? cursorKey : fallbackKey}
            dayLabel={dayLabel}
            onPickDay={pickDay}
            onFocusDay={setCursor}
            onDayKeyDown={onCellKeyDown}
          />
        ))}

      {singleMonth && pickedDate && (
        <section className={styles.dayPanel} data-schedule-day-agenda={pickedKey}>
          <h3 className={styles.heading}>
            {format(pickedDate, 'd LLLL yyyy', { locale })}
            <span className={styles.count}>{dayAgenda.length}</span>
          </h3>
          {dayAgenda.length === 0 ? (
            <p className={styles.quiet}>{t('schedule.dayEmpty')}</p>
          ) : (
            <ul className={styles.list}>
              {dayAgenda.map((span) => (
                <li key={span.id}>
                  <AgendaRow
                    span={span}
                    sentence={sentenceOf(span)}
                    selected={selectedId === span.id}
                    days={pickedKey}
                    onSelect={() => onSelect?.(selectedId === span.id ? undefined : span.id)}
                    onOpen={() => openById(span.id)}
                    onKeyDown={(event) => onBarKeyDown(event, span.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!singleMonth && (
        <AgendaMonths
          sections={sections}
          locale={locale}
          selectedId={selectedId}
          sentenceOf={sentenceOf}
          onSelect={(span) => onSelect?.(selectedId === span.id ? undefined : span.id)}
          onOpen={(span) => openById(span.id)}
        />
      )}

      <output aria-live="polite" className="sr-only">
        {message}
      </output>
    </div>
  )
}
