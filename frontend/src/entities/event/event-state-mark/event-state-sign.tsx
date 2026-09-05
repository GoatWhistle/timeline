import type { EventState } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import styles from './event-state-sign.module.css'

export const EVENT_STATE_TEXT: Record<EventState, string> = {
  UNPUBLISHED: 'text-state-unpublished',
  UPCOMING: 'text-state-upcoming',
  ACTIVE: 'text-state-active',
  FINISHED: 'text-state-finished',
  ARCHIVED: 'text-state-archived',
}

function Glyph({ state }: { state: EventState }) {
  const common = { viewBox: '0 0 12 12', className: styles.glyph, focusable: 'false' } as const

  switch (state) {
    case 'UNPUBLISHED':
      return (
        <svg aria-hidden="true" {...common}>
          <rect
            x="1.5"
            y="1.5"
            width="9"
            height="9"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2.6 2"
          />
        </svg>
      )
    case 'UPCOMING':
      return (
        <svg aria-hidden="true" {...common}>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6 3.4V6l1.9 1.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'ACTIVE':
      return (
        <svg aria-hidden="true" {...common}>
          <circle cx="6" cy="6" r="3.25" fill="currentColor" />
        </svg>
      )
    case 'FINISHED':
      return (
        <svg aria-hidden="true" {...common}>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 6.2l1.5 1.5L8.2 4.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return (
        <svg aria-hidden="true" {...common}>
          <rect x="1" y="2" width="10" height="3" rx="1" fill="currentColor" />
          <path
            d="M2.4 6.2h7.2V9a1.4 1.4 0 01-1.4 1.4H3.8A1.4 1.4 0 012.4 9V6.2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      )
  }
}

export function EventStateSign({ state, className }: { state: EventState; className?: string }) {
  return (
    <span
      data-event-state-sign={state}
      className={cn(styles.sign, EVENT_STATE_TEXT[state], className)}
    >
      {state === 'ACTIVE' && <span aria-hidden="true" className={styles.halo} />}
      <Glyph state={state} />
    </span>
  )
}
