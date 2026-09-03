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

function Bar({ className }: { className?: string }) {
  return <div className={cn('h-1 rounded-pill', className)} />
}

function HackathonBody() {
  return (
    <div className="flex h-full w-full flex-col gap-1.5 p-2">
      <div className="flex items-center gap-1">
        <Bar className="w-1/3 bg-foreground/70" />
        <div className="ml-auto h-2.5 w-5 rounded-badge bg-primary" />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1">
        <div className="flex flex-col justify-end gap-0.5 rounded-badge bg-card p-1 ring-1 ring-border">
          <div className="h-3 rounded-badge bg-accent-surface" />
        </div>
        <div className="flex flex-col justify-end gap-0.5 rounded-badge bg-card p-1 ring-1 ring-border">
          <div className="h-5 rounded-badge bg-primary/70" />
        </div>
        <div className="flex flex-col justify-end gap-0.5 rounded-badge bg-card p-1 ring-1 ring-border">
          <div className="h-2 rounded-badge bg-accent-surface" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Bar className="w-1/4 bg-muted" />
        <Bar className="w-1/5 bg-muted" />
      </div>
    </div>
  )
}

function MeetupBody() {
  return (
    <div className="flex h-full w-full flex-col gap-1.5 p-2">
      <div className="flex items-center gap-1">
        <Bar className="w-2/5 bg-foreground/70" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-pill bg-primary" />
          <Bar className="w-2/3 bg-accent-surface" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-pill bg-muted" />
          <Bar className="w-1/2 bg-muted" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-pill bg-muted" />
          <Bar className="w-3/5 bg-muted" />
        </div>
      </div>
    </div>
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

function previewClass(selected: boolean): string {
  return cn(
    'h-24 w-full motion-safe:transition-transform motion-safe:duration-base',
    'motion-safe:ease-out motion-safe:group-hover:scale-[1.02]',
    selected && 'motion-safe:scale-[1.02]',
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
