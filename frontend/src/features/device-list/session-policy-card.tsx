import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useSaveSessionPolicy, useSessionPolicy } from '@/entities/session/session-policy.queries'
import { Input } from '@/shared/ui/forms/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'

export function SessionPolicyCard() {
  const { t } = useTranslation()
  const policy = useSessionPolicy()
  const save = useSaveSessionPolicy()
  const [draft, setDraft] = useState('')

  const data = policy.data

  useEffect(() => {
    if (data === undefined) return
    setDraft(String(data.idle_days ?? data.default_days))
  }, [data])

  const days = Number(draft)
  const withinBounds =
    data !== undefined && Number.isInteger(days) && days >= data.min_days && days <= data.max_days
  const changed = withinBounds && days !== data?.idle_days

  async function store() {
    try {
      await save.mutateAsync({ idle_days: days })
      toast.success(t('devices.policySaved'))
    } catch {
      toast.error(t('devices.policyFailed'))
    }
  }

  return (
    <Card className="flex flex-1 flex-col border-destructive/40">
      <CardHeader>
        <CardTitle>{t('devices.policyTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            id="session-policy-days"
            type="number"
            inputMode="numeric"
            className="h-9 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={draft}
            min={data?.min_days}
            max={data?.max_days}
            disabled={policy.isPending || save.isPending}
            aria-label={t('devices.policyDaysLabel')}
            onChange={(event) => setDraft(event.target.value)}
          />
          <span className="text-copy text-muted-foreground">{t('devices.policyDaysLabel')}</span>
        </div>
        <div className="mt-auto flex justify-end">
          <Button
            variant="destructive"
            disabled={!changed || save.isPending}
            onClick={() => void store()}
          >
            {t('action.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
