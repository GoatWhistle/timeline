import * as DialogPrimitive from '@radix-ui/react-dialog'
import { type ReactNode, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/shared/api/session'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from '@/shared/ui/overlays/overlay-chrome'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'
import { SkeletonDetail } from '@/shared/ui/states'
import { EventOverlayBody } from './event-overlay-body'
import type { OverlayResult } from './overlay-resolvers'
import { useEventOverlay } from './use-event-overlay'

export function EventOverlayCard({
  result,
  actions,
}: {
  result: OverlayResult
  actions?: ReactNode
}) {
  const { t } = useTranslation('event')
  const { isAdmin } = useSession()
  const { open, closeEventCard } = useEventOverlay()
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useReturnFocus(open)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeEventCard()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-event-overlay-backdrop className={SCRIM} />
        <DialogPrimitive.Content
          data-event-overlay-card
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            closeRef.current?.focus()
          }}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed inset-0 z-50 m-auto flex h-fit max-h-[min(90vh,48rem)] w-[min(92vw,42rem)] flex-col overflow-hidden',
            PANEL_SURFACE,
            PANEL_MOTION,
          )}
        >
          <header className="flex items-center gap-2 border-border border-b px-5 py-3">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate font-semibold text-heading">
              {result.card?.title ?? t('overlay.title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <CloseButton ref={closeRef} label={t('detail.close')} />
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable_both-edges]">
            <TooltipProvider>
              <OverlayContent result={result} isAdmin={isAdmin} actions={actions} />
            </TooltipProvider>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function OverlayContent({
  result,
  isAdmin,
  actions,
}: {
  result: OverlayResult
  isAdmin: boolean
  actions?: ReactNode
}) {
  if (result.error) return <ErrorState error={result.error} onRetry={result.retry} />
  if (result.loading) return <SkeletonDetail />
  if (!result.card) return null

  return (
    <div className={result.stale ? 'opacity-60 transition-opacity duration-fast' : ''}>
      <EventOverlayBody card={result.card} isAdmin={isAdmin} actions={actions} />
    </div>
  )
}
