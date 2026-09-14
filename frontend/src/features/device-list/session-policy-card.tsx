import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSaveSessionPolicy, useSessionPolicy } from '@/entities/session/session-policy.queries'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { Switch } from '@/shared/ui/forms/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export function SessionPolicyCard() {
  const { t } = useTranslation()
  const policy = useSessionPolicy()
  const save = useSaveSessionPolicy()
  const [draft, setDraft] = useState('')

  const data = policy.data
  const sweeping = data?.idle_days !== undefined && data.idle_days !== null

  useEffect(() => {
    if (data === undefined) return
    setDraft(String(data.idle_days ?? data.default_days))
  }, [data])

  async function store(idleDays: number | null) {
    try {
      await save.mutateAsync({ idle_days: idleDays })
      toast.success(t('devices.policySaved'))
    } catch {
      toast.error(t('devices.policyFailed'))
    }
  }

  const days = Number(draft)
  const withinBounds =
    data !== undefined && Number.isInteger(days) && days >= data.min_days && days <= data.max_days
  const changed = withinBounds && days !== data?.idle_days

  return (
    <Card className="flex-1 border-destructive/40">
      <CardHeader>
        <CardTitle>{t('devices.policyTitle')}</CardTitle>
        <CardDescription>{t('devices.policyHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-copy" htmlFor="session-policy-sweeping">
            {t('devices.policySweeping')}
          </label>
          <Switch
            id="session-policy-sweeping"
            checked={sweeping}
            disabled={policy.isPending || save.isPending}
            onCheckedChange={(on) => void store(on ? (data?.default_days ?? null) : null)}
          />
        </div>

        <Field label={t('devices.policyDaysLabel')} htmlFor="session-policy-days">
          <div className="flex items-center gap-2">
            <Input
              id="session-policy-days"
              type="number"
              inputMode="numeric"
              className="h-9 w-28"
              value={draft}
              min={data?.min_days}
              max={data?.max_days}
              disabled={!sweeping || policy.isPending || save.isPending}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              variant="outline"
              disabled={!changed || save.isPending}
              onClick={() => void store(days)}
            >
              {t('action.save')}
            </Button>
          </div>
        </Field>
      </CardContent>
    </Card>
  )
}
