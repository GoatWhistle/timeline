import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useDeactivateAccount, useLogoutAllSessions } from '@/entities/user/profile.queries'
import { resetCsrfToken } from '@/shared/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'

export function LogoutAllCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logoutAll = useLogoutAllSessions()
  const [logoutAllOpen, setLogoutAllOpen] = useState(false)

  async function onLogoutAll() {
    try {
      await logoutAll.mutateAsync()
    } catch {
      toast.error(t('profile.logoutAllFailed'))
    }
    resetCsrfToken()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{t('profile.logoutAllTitle')}</CardTitle>
          <CardDescription>{t('profile.sessionsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button
            variant="destructive"
            disabled={logoutAll.isPending}
            onClick={() => setLogoutAllOpen(true)}
          >
            {t('profile.logoutAll')}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={logoutAllOpen}
        onOpenChange={setLogoutAllOpen}
        title={t('profile.confirmLogoutAllTitle')}
        description={t('profile.confirmLogoutAllHint')}
        confirmLabel={t('profile.logoutAll')}
        destructive
        disabled={logoutAll.isPending}
        onConfirm={onLogoutAll}
      />
    </>
  )
}

export function DeactivateAccountCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deactivate = useDeactivateAccount()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  async function onDeactivate() {
    try {
      await deactivate.mutateAsync()
      resetCsrfToken()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error(t('profile.deactivateFailed'))
    }
  }

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{t('profile.deactivateTitle')}</CardTitle>
          <CardDescription>{t('profile.deactivateHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
            {t('profile.deactivate')}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={t('profile.confirmDeactivateTitle')}
        description={t('profile.confirmDeactivateHint')}
        confirmLabel={t('profile.deactivate')}
        destructive
        disabled={deactivate.isPending}
        onConfirm={onDeactivate}
      />
    </>
  )
}
