import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useDeactivateAccount, useLogoutAllSessions } from '@/entities/user/profile.queries'
import { resetCsrfToken } from '@/shared/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'

export function AccountActionsCard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deactivate = useDeactivateAccount()
  const logoutAll = useLogoutAllSessions()
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  async function onDeactivate() {
    try {
      await deactivate.mutateAsync()
      resetCsrfToken()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Не удалось деактивировать учётную запись')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Сессии</CardTitle>
          <CardDescription>
            Завершение всех сессий выкинет вас из системы на всех устройствах.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={logoutAll.isPending}
            onClick={async () => {
              await logoutAll.mutateAsync().catch(() => toast.error('Не удалось завершить сессии'))
              resetCsrfToken()
              queryClient.clear()
              navigate('/login', { replace: true })
            }}
          >
            Завершить все сессии
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Деактивация учётной записи</CardTitle>
          <CardDescription>
            Деактивация обратима: вход блокируется, привязка Telegram удаляется, запланированные
            уведомления отменяются. Вернуть доступ может администратор.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
            Деактивировать
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Деактивировать учётную запись?"
        description="Вы выйдете из системы, а вход будет заблокирован до восстановления администратором."
        confirmLabel="Деактивировать"
        destructive
        disabled={deactivate.isPending}
        onConfirm={onDeactivate}
      />
    </>
  )
}
