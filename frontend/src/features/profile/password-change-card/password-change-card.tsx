import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Button } from '@/shared/ui/primitives/button'
import { PasswordChangeForm } from './password-change-form'

export function PasswordChangeCard() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{t('profile.passwordTitle')}</CardTitle>
        <Button
          variant={open ? 'outline' : 'default'}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? t('action.cancel') : t('profile.changePassword')}
        </Button>
      </CardHeader>
      {open ? (
        <CardContent>
          <PasswordChangeForm onChanged={() => setOpen(false)} />
        </CardContent>
      ) : null}
    </Card>
  )
}
