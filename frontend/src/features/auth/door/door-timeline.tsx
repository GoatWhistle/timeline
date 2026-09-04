import { useTranslation } from 'react-i18next'
import styles from './door-timeline.module.css'

const STEPS = [
  { key: 'door.stageRegistration', tone: 'var(--stage-registration)', width: '96%' },
  { key: 'door.stageSelection', tone: 'var(--stage-selection)', width: '74%' },
  { key: 'door.stageParticipation', tone: 'var(--stage-participation)', width: '88%' },
  { key: 'door.stageSubmission', tone: 'var(--stage-submission)', width: '58%' },
  { key: 'door.stageResults', tone: 'var(--stage-results)', width: '42%' },
] as const

export function DoorTimeline() {
  const { t } = useTranslation('auth')

  return (
    <ol className={styles.rail} aria-label={t('door.railLabel')}>
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          className={styles.step}
          style={
            {
              '--tone': step.tone,
              '--delay': `${index * 90}ms`,
            } as React.CSSProperties
          }
        >
          <span className={styles.node} aria-hidden="true" />
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">{t(step.key)}</span>
            <span
              className={styles.bar}
              style={{ width: step.width, '--delay': `${index * 90}ms` } as React.CSSProperties}
              aria-hidden="true"
            />
          </span>
        </li>
      ))}
    </ol>
  )
}
