import { Plus, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePrizePlaceLabel } from '@/entities/prize/prize-place-mark'
import { formatMoney } from '@/shared/money/money'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { MoneyInput } from '@/shared/ui/forms/money-input'
import { Button } from '@/shared/ui/primitives/button'
import { DeleteAction } from '@/shared/ui/primitives/row-actions'

export type PrizeDraft = { place?: number; title?: string; amount: string }

export function isNomination(prize: PrizeDraft): boolean {
  return prize.place === undefined
}

export function draftKey(prize: PrizeDraft, index: number): string {
  return prize.place === undefined ? `nomination-${index}` : `place-${prize.place}`
}

export const NOMINATION_TITLE_MAX = 120

export function draftTotal(prizes: PrizeDraft[]): number {
  return prizes.reduce((sum, prize) => sum + Number(prize.amount || '0'), 0)
}

export function nextPlace(prizes: PrizeDraft[]): number {
  return prizes.reduce((highest, prize) => Math.max(highest, prize.place ?? 0), 0) + 1
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

  function rename(index: number, title: string) {
    onChange(prizes.map((prize, at) => (at === index ? { ...prize, title } : prize)))
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-medium text-copy">{t('tracks.formPrizes')}</legend>

      {prizes.length === 0 && (
        <p className="text-caption text-muted-foreground">{t('tracks.formPrizesEmpty')}</p>
      )}

      <ul className="flex flex-col gap-2">
        {prizes.map((prize, index) => {
          const key = draftKey(prize, index)
          const nomination = isNomination(prize)
          return (
            <li key={key} className="flex items-end gap-2">
              {nomination && (
                <Field
                  className="flex-1"
                  label={t('tracks.formNominationTitle')}
                  htmlFor={`${idPrefix}-title-${key}`}
                >
                  <Input
                    id={`${idPrefix}-title-${key}`}
                    value={prize.title ?? ''}
                    maxLength={NOMINATION_TITLE_MAX}
                    onChange={(event) => rename(index, event.target.value)}
                  />
                </Field>
              )}
              <Field
                className="flex-1"
                label={nomination ? t('tracks.formPrizeAmount') : placeLabel(prize.place ?? 0)}
                htmlFor={`${idPrefix}-prize-${key}`}
              >
                <MoneyInput
                  id={`${idPrefix}-prize-${key}`}
                  value={prize.amount}
                  onChange={(digits) => edit(index, digits)}
                />
              </Field>
              <DeleteAction
                className="mb-0.5"
                label={
                  nomination
                    ? t('tracks.formNominationRemove', { title: prize.title })
                    : t('tracks.formPrizeRemove', { place: prize.place })
                }
                onClick={() => onChange(prizes.filter((_, at) => at !== index))}
              />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...prizes, { place: nextPlace(prizes), amount: '' }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('tracks.formPrizeAdd')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...prizes, { title: '', amount: '' }])}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t('tracks.formNominationAdd')}
          </Button>
        </div>
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
