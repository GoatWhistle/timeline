import { Armchair, Laptop } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import type { EventKind, EventOrigin } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Field } from '@/shared/ui/forms/field'
import { OptionCard, OptionMark } from '@/shared/ui/forms/option-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'
import { EVENT_KINDS, EVENT_ORIGINS } from './event-form.schema'

export function EventOriginField({
  value,
  onChange,
}: {
  value: EventOrigin
  onChange: (value: EventOrigin) => void
}) {
  const { t } = useTranslation('event')

  return (
    <Field label={t('form.origin')} htmlFor="origin" hint={t('form.originHint')}>
      <Select value={value} onValueChange={(next) => onChange(next as EventOrigin)}>
        <SelectTrigger id="origin">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EVENT_ORIGINS.map((origin) => (
            <SelectItem key={origin} value={origin}>
              {t(`form.originValue.${origin}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

const STROKE = { strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 96"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      className="h-full w-full text-border-strong"
    >
      <g stroke="currentColor" {...STROKE}>
        {children}
      </g>
      <line
        x1="18"
        y1="78"
        x2="142"
        y2="78"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.45}
      />
    </svg>
  )
}

function HackathonBody() {
  return (
    <Scene>
      <path d="M52 22a3 3 0 0 1 3-3h50a3 3 0 0 1 3 3v46H52z" className="fill-accent-surface" />
      <path d="M58 25h44v34H58z" className="fill-primary/15" strokeWidth={1.5} />
      <path
        d="M65 33h13M65 39h20M65 45h9"
        className="text-primary"
        strokeWidth={2}
        opacity={0.85}
      />
      <path d="M90 35l5 4-5 4" strokeWidth={1.75} className="text-primary" />
      <path
        d="M47 68h66l4 7a1.5 1.5 0 0 1-1.5 2.5H44.5A1.5 1.5 0 0 1 43 75z"
        className="fill-card"
      />
      <path d="M71 73h18" strokeWidth={1.75} opacity={0.6} />
    </Scene>
  )
}

function Glass({ x, height }: { x: number; height: number }) {
  const top = 78 - height
  const bowl = height * 0.52
  const rim = 9.5
  const waist = rim * 0.3
  return (
    <g transform={`translate(${x} 0)`}>
      <path
        d={`M${-rim} ${top}
            C${-rim} ${top + bowl * 0.62} ${-waist} ${top + bowl * 0.9} 0 ${top + bowl}
            C${waist} ${top + bowl * 0.9} ${rim} ${top + bowl * 0.62} ${rim} ${top}Z`}
        className="fill-primary/25"
      />
      <path d={`M${-rim} ${top}h${rim * 2}`} strokeWidth={2.25} />
      <path d={`M0 ${top + bowl}v${height - bowl - 4}`} />
      <path d={`M${-rim * 0.7} 78h${rim * 1.4}`} strokeWidth={2.5} />
    </g>
  )
}

function MeetupBody() {
  return (
    <Scene>
      <Glass x={54} height={38} />
      <Glass x={80} height={48} />
      <Glass x={106} height={34} />
    </Scene>
  )
}

function EventKindPreview({ kind, className }: { kind: EventKind; className?: string }) {
  return (
    <div
      data-kind-preview={kind}
      aria-hidden="true"
      className={cn(
        'pointer-events-none overflow-hidden rounded-control border border-border bg-background',
        'transition-colors duration-base ease-out',
        className,
      )}
    >
      {kind === 'MEETUP' ? <MeetupBody /> : <HackathonBody />}
    </div>
  )
}

const KIND_ICON: Record<EventKind, React.ComponentType<{ className?: string }>> = {
  HACKATHON: Laptop,
  MEETUP: Armchair,
}

function previewClass(selected: boolean): string {
  return cn(
    'h-24 w-full motion-safe:transition-transform motion-safe:duration-base',
    'motion-safe:ease-out motion-safe:group-hover:scale-[1.02]',
    selected && 'motion-safe:scale-[1.02]',
  )
}

export function EventKindLocked({ value }: { value: EventKind }) {
  const { t } = useTranslation('event')
  const Icon = KIND_ICON[value]

  return (
    <div className="flex flex-col gap-2 sm:max-w-xl">
      <p className="text-caption text-muted-foreground">{t('form.kindFixed')}</p>
      <div
        data-kind-locked={value}
        className="flex items-center gap-3 rounded-surface border border-border bg-accent-surface p-2"
      >
        <EventKindPreview kind={value} className="h-16 w-24 shrink-0" />
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-copy">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(`catalog.kindLabel.${value}`)}</span>
        </span>
      </div>
    </div>
  )
}

export function EventKindChoice({
  value,
  onChange,
}: {
  value: EventKind
  onChange: (value: EventKind) => void
}) {
  const { t } = useTranslation('event')

  return (
    <fieldset
      aria-label={t('form.kind')}
      className="grid gap-3 sm:max-w-xl sm:grid-cols-2"
      data-testid="kind"
    >
      {EVENT_KINDS.map((kind) => {
        const selected = value === kind
        const Icon = KIND_ICON[kind]
        return (
          <OptionCard
            key={kind}
            name="event-kind-choice"
            value={kind}
            selected={selected}
            onSelect={() => onChange(kind)}
            data-kind-option={kind}
            className="flex-col gap-2 p-2"
          >
            <EventKindPreview kind={kind} className={previewClass(selected)} />
            <span className="flex items-center gap-1.5 px-1 pb-0.5 text-copy">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span
                className={cn(
                  'min-w-0 truncate',
                  selected ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {t(`catalog.kindLabel.${kind}`)}
              </span>
              <OptionMark selected={selected} className="ml-auto size-4" />
            </span>
          </OptionCard>
        )
      })}
    </fieldset>
  )
}
