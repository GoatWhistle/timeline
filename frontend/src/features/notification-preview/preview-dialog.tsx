import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  derivePreviewState,
  notificationPreviewQuery,
  type PreviewDaysBefore,
  type PreviewOccasion,
} from '@/entities/notification-preview'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { PreviewBody } from './preview-body'

export function NotificationPreviewDialog({
  statusId,
  occasion,
  daysBefore,
  open,
  onOpenChange,
}: {
  statusId: string | null
  occasion?: PreviewOccasion
  daysBefore?: PreviewDaysBefore
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('notification')
  const enabled = open && statusId !== null

  const query = useQuery(
    notificationPreviewQuery({ statusId: statusId ?? '', occasion, daysBefore, enabled }),
  )

  const state = derivePreviewState({
    enabled,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    data: query.data,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('preview.title')}</DialogTitle>
          <DialogDescription>{t('preview.subtitle')}</DialogDescription>
        </DialogHeader>
        <PreviewBody state={state} onRetry={() => query.refetch()} />
      </DialogContent>
    </Dialog>
  )
}
