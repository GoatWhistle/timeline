import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { sortSessions } from '@/entities/session/device-label'
import { deviceSessionsQuery, useRevokeSession } from '@/entities/session/device-sessions.queries'
import { resetCsrfToken } from '@/shared/api/client'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { QueryBoundary } from '@/shared/ui/states'
import { DeviceRow } from './device-row'
import { DeviceSkeleton } from './device-skeleton'
import { RenameDevice } from './rename-device'

export function DeviceList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery(deviceSessionsQuery())
  const revoke = useRevokeSession()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  const items = sortSessions(query.data?.items ?? [])

  async function revokeSession(id: string, current: boolean) {
    try {
      await revoke.mutateAsync(id)
      if (current) {
        resetCsrfToken()
        queryClient.clear()
        navigate('/login', { replace: true })
        return
      }
      toast.success(t('devices.revoked'))
    } catch {
      toast.error(t('devices.revokeFailed'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('devices.title')}</CardTitle>
        <CardDescription>{t('devices.hint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryBoundary
          isPending={query.isPending}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          hasData={query.data !== undefined}
          skeleton={<DeviceSkeleton rows={3} />}
        >
          {items.length === 0 ? (
            <EmptyState title={t('devices.emptyTitle')} description={t('devices.emptyHint')} />
          ) : (
            <>
              <p className="mb-2 text-meta text-muted-foreground">
                {t('devices.count', { count: items.length })}
              </p>
              <ul className="flex flex-col gap-2">
                {items.map((session) =>
                  renamingId === session.id ? (
                    <li key={session.id}>
                      <RenameDevice session={session} onDone={() => setRenamingId(null)} />
                    </li>
                  ) : (
                    <DeviceRow
                      key={session.id}
                      session={session}
                      pending={revoke.isPending}
                      onRename={() => setRenamingId(session.id)}
                      onRevoke={() => {
                        if (session.current === true) {
                          setConfirmId(session.id)
                          return
                        }
                        void revokeSession(session.id, false)
                      }}
                    />
                  ),
                )}
              </ul>
            </>
          )}
        </QueryBoundary>
      </CardContent>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmId(null)
        }}
        title={t('devices.revokeCurrentTitle')}
        description={t('devices.revokeCurrentHint')}
        confirmLabel={t('devices.revoke')}
        destructive
        disabled={revoke.isPending}
        onConfirm={() => {
          const id = confirmId
          setConfirmId(null)
          if (id) void revokeSession(id, true)
        }}
      />
    </Card>
  )
}
