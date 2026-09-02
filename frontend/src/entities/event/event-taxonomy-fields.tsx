import { useTranslation } from 'react-i18next'
import type { EventKind, EventOrigin } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { Field } from '@/shared/ui/forms/field'
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

export function EventKindChoice({
  value,
  onChange,
}: {
  value: EventKind
  onChange: (value: EventKind) => void
}) {
  const { t } = useTranslation('event')

  return (
    <fieldset aria-label={t('form.kind')} className="grid grid-cols-2 gap-3" data-testid="kind">
      {EVENT_KINDS.map((kind) => {
        const selected = value === kind
        return (
          <label
            key={kind}
            data-kind-option={kind}
            data-selected={selected ? 'true' : undefined}
            className={cn(
              'flex cursor-pointer flex-col gap-1 rounded-surface border px-3 py-2.5',
              'transition-colors duration-base ease-out',
              'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
              selected
                ? 'border-primary bg-accent-surface'
                : 'border-border hover:border-border-strong',
            )}
          >
            <span className={cn('text-copy', selected && 'font-medium')}>
              {t(`catalog.kindLabel.${kind}`)}
            </span>
            <span className="text-caption text-muted-foreground">{t(`form.kindHint.${kind}`)}</span>
            <input
              type="radio"
              name="event-kind-choice"
              value={kind}
              checked={selected}
              onChange={() => onChange(kind)}
              className="sr-only"
            />
          </label>
        )
      })}
    </fieldset>
  )
}
