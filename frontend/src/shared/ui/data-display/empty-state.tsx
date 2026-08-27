import { Inbox } from 'lucide-react'
import type * as React from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}
