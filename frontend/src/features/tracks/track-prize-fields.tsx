import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePrizePlaceLabel } from '@/entities/prize/prize-place-mark'
import { formatMoney } from '@/shared/money/money'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction } from '@/shared/ui/primitives/row-actions'

export type PrizeDraft = { place: number; amount: string }

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function draftTotal(prizes: PrizeDraft[]): number {
  return prizes.reduce((sum, prize) => sum + Number(prize.amount || '0'), 0)
}

export function nextPlace(prizes: PrizeDraft[]): number {
  return prizes.reduce((highest, prize) => Math.max(highest, prize.place), 0) + 1
}

export function TrackPrizeFields({
  prizes,
  currency,
  idPrefix,
  onChange,
}: {
  prizes: PrizeDraft[]
  currency: string | undefined
  idPrefix: string
  onChange: (prizes: PrizeDraft[]) => void
}) {
  const { t } = useTranslation('event')
  const placeLabel = usePrizePlaceLabel()
  const total = draftTotal(prizes)

  function edit(index: number, amount: string) {
    onChange(prizes.map((prize, at) => (at === index ? { ...prize, amount } : prize)))
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-medium text-copy">{t('tracks.formPrizes')}</legend>

      {prizes.length === 0 && (
        <p className="text-caption text-muted-foreground">{t('tracks.formPrizesEmpty')}</p>
      )}

      <ul className="flex flex-col gap-2">
        {prizes.map((prize, index) => (
          <li key={prize.place} className="flex items-end gap-2">
            <Field
              className="flex-1"
              label={placeLabel(prize.place)}
              htmlFor={`${idPrefix}-prize-${prize.place}`}
            >
              <Input
                id={`${idPrefix}-prize-${prize.place}`}
                inputMode="numeric"
                value={prize.amount}
                onChange={(event) => edit(index, digitsOnly(event.target.value))}
              />
            </Field>
            <DeleteAction
              className="mb-0.5"
              label={t('tracks.formPrizeRemove', { place: prize.place })}
              onClick={() => onChange(prizes.filter((_, at) => at !== index))}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...prizes, { place: nextPlace(prizes), amount: '' }])}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('tracks.formPrizeAdd')}
        </Button>
        <p className="text-caption text-muted-foreground">
          {t('tracks.formPrizeTotal')}{' '}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(String(total), currency) ?? total}
          </span>
        </p>
      </div>
    </fieldset>
  )
}
