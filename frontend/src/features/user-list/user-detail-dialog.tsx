import { Check, Clock, Globe, Mail, Send, Shield, X } from 'lucide-react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { listName } from '@/entities/user/person-name/person-name'
import { UserAvatar } from '@/entities/user/user-avatar'
import type { AdminUserSummary } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { useLocale } from '@/shared/i18n/i18n-context'
import { cn } from '@/shared/styling/class-names/class-names'
import { Fact, FactList } from '@/shared/ui/data-display/fact-list'
import { NoValue } from '@/shared/ui/data-display/no-value/no-value'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'

function Line({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  actions,
}: {
  user: AdminUserSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: React.ReactNode
}) {
  const { t } = useTranslation()
  const { locale } = useLocale()

  if (!user) return null

  const name = listName(user, locale)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar
            seed={user.id}
            displayName={user.display_name}
            firstName={user.first_name}
            lastName={user.last_name}
            avatarUrl={user.avatar_url}
            className="size-16 text-screen"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold text-screen tracking-tight">{name}</span>
            {user.nickname ? (
              <span className="truncate text-caption text-muted-foreground">@{user.nickname}</span>
            ) : null}
            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {user.is_admin && <Badge tone="primary">{t('users.roleAdmin')}</Badge>}
              <Badge tone={user.is_active ? 'neutral' : 'danger'}>
                {user.is_active ? t('users.active') : t('users.deactivated')}
              </Badge>
            </span>
          </div>
        </div>

        {user.bio ? (
          <p className="whitespace-pre-wrap break-words text-copy text-muted-foreground">
            {user.bio}
          </p>
        ) : null}

        <FactList>
          <Fact label={t('users.column.email')}>
            <Line icon={Mail}>
              <span className="break-all">{user.email}</span>
            </Line>
          </Fact>

          <Fact label={t('users.column.telegram')}>
            {user.telegram_username ? (
              <Line icon={Send}>{user.telegram_username}</Line>
            ) : (
              <span className="font-normal text-muted-foreground">
                {t('users.telegramMissing')}
              </span>
            )}
          </Fact>

          <Fact label={t('users.column.verified')}>
            <Line icon={user.email_verified_at ? Check : X}>
              <span className={cn(!user.email_verified_at && 'font-normal text-muted-foreground')}>
                {user.email_verified_at
                  ? formatDateTime(user.email_verified_at)
                  : t('users.notVerified')}
              </span>
            </Line>
          </Fact>

          <Fact label={t('users.column.created')}>
            <Line icon={Clock}>{formatDateTime(user.created_at)}</Line>
          </Fact>

          <Fact label={t('users.column.timezone')}>
            <Line icon={Globe}>
              {user.timezone || <NoValue />}
              <span className="pl-2 text-caption text-muted-foreground">
                {user.locale?.toUpperCase()}
              </span>
            </Line>
          </Fact>

          <Fact label={t('users.column.role')}>
            <Line icon={Shield}>
              {user.is_admin ? t('users.roleAdmin') : t('users.roleMember')}
            </Line>
          </Fact>
        </FactList>

        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </DialogContent>
    </Dialog>
  )
}
