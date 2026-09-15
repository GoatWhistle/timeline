import { Archive, Ellipsis, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useModerateEvent } from '@/entities/event/event.queries'
import type { EventResponse } from '@/shared/api/types.gen'
import { cn } from '@/shared/styling/class-names/class-names'
import { ConfirmDialog } from '@/shared/ui/overlays/confirm-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/overlays/popover'
import { Button } from '@/shared/ui/primitives/button'

export function canPublish(event: EventResponse): boolean {
  return event.published_at === undefined && event.archived_at === undefined
}

export function canArchive(event: EventResponse): boolean {
  return event.archived_at === undefined
}

export function ModerationMenu({ event }: { event: EventResponse }) {
  const { t } = useTranslation('event')
  const moderate = useModerateEvent()
  const [publishOpen, setPublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const publishable = canPublish(event)
  const archivable = canArchive(event)

  if (!publishable && !archivable) return null

  async function run(action: 'publish' | 'archive', close: (open: boolean) => void) {
    await moderate
      .mutateAsync({ id: event.id, action })
      .then(() =>
        toast.success(action === 'publish' ? t('detail.published') : t('detail.archived')),
      )
      .catch(() =>
        toast.error(action === 'publish' ? t('detail.publishFailed') : t('detail.archiveFailed')),
      )
    close(false)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('list.moderateAria', { title: event.title })}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-control',
              'text-muted-foreground transition-colors duration-instant ease-out',
              'hover:bg-surface-2 hover:text-foreground',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <Ellipsis className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-48 p-1"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <div className="flex flex-col gap-0.5">
            {publishable && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setPublishOpen(true)}
              >
                <Send className="size-4" aria-hidden="true" />
                {t('detail.publish')}
              </Button>
            )}
            {archivable && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="size-4" aria-hidden="true" />
                {t('detail.archive')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={t('detail.confirmPublishTitle')}
        description={t('detail.confirmPublishHint')}
        confirmLabel={t('detail.publish')}
        disabled={moderate.isPending}
        onConfirm={() => run('publish', setPublishOpen)}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('detail.confirmArchiveTitle')}
        description={t('detail.confirmArchiveHint')}
        confirmLabel={t('detail.archive')}
        destructive
        disabled={moderate.isPending}
        onConfirm={() => run('archive', setArchiveOpen)}
      />
    </>
  )
}
