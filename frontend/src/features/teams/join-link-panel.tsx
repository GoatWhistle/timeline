import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  teamJoinLinkQuery,
  useRevokeJoinLink,
  useRotateJoinLink,
} from '@/entities/team/team.queries'
import { formatDateTime } from '@/shared/datetime/datetime'
import { Input } from '@/shared/ui/forms/input'
import { Button } from '@/shared/ui/primitives/button'

export function JoinLinkPanel({ teamId, open }: { teamId: string; open: boolean }) {
  const { t } = useTranslation('team')
  const [issued, setIssued] = useState<string | null>(null)
  const query = useQuery(teamJoinLinkQuery(teamId, open))
  const rotate = useRotateJoinLink(teamId)
  const revoke = useRevokeJoinLink(teamId)

  async function submitRotate() {
    try {
      const link = await rotate.mutateAsync()
      setIssued(link.url)
      toast.success(t('linkIssued'))
    } catch {
      toast.error(t('linkFailed'))
    }
  }

  async function submitRevoke() {
    try {
      await revoke.mutateAsync()
      setIssued(null)
      toast.success(t('linkRevoked'))
    } catch {
      toast.error(t('linkFailed'))
    }
  }

  async function copy() {
    if (issued === null) return
    try {
      await navigator.clipboard.writeText(issued)
      toast.success(t('linkCopied'))
    } catch {
      toast.error(t('linkCopyFailed'))
    }
  }

  const active = query.data?.active === true

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-muted-foreground">{t('inviteByLinkHint')}</p>

      {issued !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input readOnly value={issued} aria-label={t('inviteByLinkLabel')} />
            <Button variant="outline" size="icon" onClick={copy} aria-label={t('linkCopy')}>
              <Copy aria-hidden="true" />
            </Button>
          </div>
          <p className="text-caption text-muted-foreground">{t('linkShownOnce')}</p>
        </div>
      )}

      {issued === null && active && query.data?.expires_at !== undefined && (
        <p className="text-caption text-muted-foreground">
          {t('linkActiveUntil', { until: formatDateTime(query.data.expires_at) })}
        </p>
      )}

      {issued === null && !active && (
        <p className="text-caption text-muted-foreground">{t('linkNone')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={submitRotate} disabled={rotate.isPending}>
          {t(active || issued !== null ? 'linkRotate' : 'linkIssue')}
        </Button>
        {(active || issued !== null) && (
          <Button variant="ghost" onClick={submitRevoke} disabled={revoke.isPending}>
            {t('linkRevoke')}
          </Button>
        )}
      </div>
    </div>
  )
}
