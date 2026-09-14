import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/layout/card'

export function ChannelCard({
  title,
  mark,
  value,
  valueMark,
  note,
  action,
  children,
}: {
  title: string
  mark?: ReactNode
  value?: ReactNode
  valueMark?: ReactNode
  note?: ReactNode
  action: ReactNode
  children?: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {mark}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0 pb-4">
        {children}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {value ? (
              <span className="flex min-w-0 items-center gap-1.5 break-all font-medium text-copy text-foreground">
                {value}
                {valueMark}
              </span>
            ) : null}
            {note ? <CardDescription className="min-w-0 break-all">{note}</CardDescription> : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">{action}</div>
        </div>
      </CardContent>
    </Card>
  )
}
