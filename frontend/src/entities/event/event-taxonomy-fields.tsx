import { useTranslation } from 'react-i18next'
import type { EventKind, EventOrigin } from '@/shared/api/types.gen'
import { Field } from '@/shared/ui/forms/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'

const KINDS: EventKind[] = ['HACKATHON', 'MEETUP']
const ORIGINS: EventOrigin[] = ['RU', 'WORLD']

export function EventTaxonomyFields({
  kind,
  origin,
  onKind,
  onOrigin,
}: {
  kind: EventKind
  origin: EventOrigin
  onKind: (value: EventKind) => void
  onOrigin: (value: EventOrigin) => void
}) {
  const { t } = useTranslation('event')

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label={t('form.kind')} htmlFor="kind">
        <Select value={kind} onValueChange={(value) => onKind(value as EventKind)}>
          <SelectTrigger id="kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`catalog.kindLabel.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('form.origin')} htmlFor="origin" hint={t('form.originHint')}>
        <Select value={origin} onValueChange={(value) => onOrigin(value as EventOrigin)}>
          <SelectTrigger id="origin">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIGINS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`form.originValue.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
