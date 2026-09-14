import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PasswordChangeForm } from './password-change-form'

export function PasswordChangeCard() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="flex-1 border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle>{t('profile.passwordTitle')}</CardTitle>
          <CardDescription>{t('profile.passwordHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end pt-1 pb-4">
          <Button variant="destructive" className="mt-[0.625rem]" onClick={() => setOpen(true)}>
            {t('profile.changePassword')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.passwordTitle')}</DialogTitle>
          </DialogHeader>
          <PasswordChangeForm onChanged={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
