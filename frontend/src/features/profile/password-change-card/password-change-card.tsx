import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { PasswordChangeForm } from './password-change-form'

export function PasswordChangeCard() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="flex-1 border-destructive/40">
        <CardHeader className="pb-4">
          <CardTitle>{t('profile.passwordTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-end pt-0 pb-5">
          <Button variant="destructive" onClick={() => setOpen(true)}>
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
