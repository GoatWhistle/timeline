import type { Locale } from 'date-fns'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { CalendarSpan } from '../../model/calendar-items'
import type { AgendaMonth } from '../../model/phone-agenda'
import { AgendaRow } from './agenda-row'
import styles from './phone-agenda.module.css'

export function AgendaMonths({
  sections,
  locale,
  selectedId,
  sentenceOf,
  onSelect,
  onOpen,
}: {
  sections: readonly AgendaMonth[]
  locale: Locale
  selectedId?: string
  sentenceOf: (span: CalendarSpan) => string
  onSelect: (span: CalendarSpan) => void
  onOpen: (span: CalendarSpan) => void
}) {
  const { t } = useTranslation()

  return (
    <>
      {sections.map((section) => (
        <section
          className={styles.section}
          key={section.key}
          data-schedule-month={section.key}
          data-empty={section.spans.length === 0 ? 'true' : 'false'}
        >
          <h3 className={styles.heading}>
            {format(section.date, 'LLLL yyyy', { locale })}
            <span className={styles.count}>
              {section.spans.length === 0 ? (
                <span className="sr-only">{t('schedule.monthEmpty')}</span>
              ) : (
                section.spans.length
              )}
            </span>
          </h3>
          {section.spans.length > 0 && (
            <ul className={styles.list}>
              {section.spans.map((span) => (
                <li key={span.id}>
                  <AgendaRow
                    span={span}
                    sentence={sentenceOf(span)}
                    selected={selectedId === span.id}
                    onSelect={() => onSelect(span)}
                    onOpen={() => onOpen(span)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
