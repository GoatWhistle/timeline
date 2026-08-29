import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MeResponse } from '@/shared/api/types.gen'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'

export function AccountIdentityCard({ user }: { user: MeResponse }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.identityTitle')}</CardTitle>
        <CardDescription>{t('account.identityHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">{t('account.email')}</span>
          <span className="min-w-0 break-all font-medium text-copy">{user.email}</span>
          {user.email_verified ? (
            <Badge tone="primary">
              <BadgeCheck className="size-3 shrink-0" aria-hidden="true" />
              {t('account.emailVerified')}
            </Badge>
          ) : (
            <Badge tone="danger">
              <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
              {t('account.emailUnverified')}
            </Badge>
          )}
        </div>

        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="text-meta text-muted-foreground">{t('account.role')}</dt>
          <dd className="text-copy">
            {user.is_admin ? t('account.roleAdmin') : t('account.roleMember')}
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}
