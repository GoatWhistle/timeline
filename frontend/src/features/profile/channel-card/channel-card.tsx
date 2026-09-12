import { Clock, Link2, Link2Off } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Badge } from '@/shared/ui/primitives/badge'
import { CHANNEL_STATE_LABEL, CHANNEL_STATE_TONE, type ChannelState } from './channel-state'

const STATE_ICON = {
  unlinked: Link2Off,
  pending: Clock,
  linked: Link2,
} as const

export function ChannelCard({
  title,
  hint,
  mark,
  state,
  value,
  valueMark,
  action,
  children,
}: {
  title: string
  hint: string
  mark?: ReactNode
  state: ChannelState
  value?: ReactNode
  valueMark?: ReactNode
  action: ReactNode
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const Icon = STATE_ICON[state]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mark}
          {title}
        </CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Badge tone={CHANNEL_STATE_TONE[state]}>
              <Icon className="size-3 shrink-0" aria-hidden="true" />
              {t(CHANNEL_STATE_LABEL[state])}
            </Badge>
            {value ? (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 break-all text-meta text-muted-foreground">
                {value}
                {valueMark}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
