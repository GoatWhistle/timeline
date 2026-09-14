import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotificationPreferences } from '@/entities/notification/notification-preferences.queries'
import { useSession } from '@/shared/api/session'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { SAFE_BOTTOM, SAFE_TOP, TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'
import { usePhoneViewport } from '@/shared/ui/layout/mobile/use-phone-viewport'
import { CrossfadeSwap } from '@/shared/ui/motion/crossfade-swap'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from '@/shared/ui/overlays/overlay-chrome'
import { CloseButton } from '@/shared/ui/primitives/close-button'
import { QueryBoundary } from '@/shared/ui/states'
import { SETTINGS_SECTIONS } from './sections'
import { SettingsIndex, SettingsRail } from './settings-nav'
import { SettingsPanel } from './settings-panels'
import { useSettingsOverlay } from './use-settings-overlay'

export function SettingsOverlay() {
  const { t } = useTranslation()
  const { user } = useSession()
  const { open, section, atIndex, setSection, showIndex, closeSettings } = useSettingsOverlay()
  const notificationPreferences = useNotificationPreferences(open && section === 'notifications')
  const phone = usePhoneViewport()
  const activeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useReturnFocus(open)
  const rank = SETTINGS_SECTIONS.findIndex((item) => item.id === section)
  const previousRank = useRef(rank)
  const direction =
    rank === previousRank.current ? undefined : rank > previousRank.current ? 'left' : 'right'

  useEffect(() => {
    previousRank.current = rank
  }, [rank])

  if (!user) return null

  const heading = t(SETTINGS_SECTIONS.find((item) => item.id === section)?.labelKey ?? '')
  const showingIndex = phone && atIndex

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={SCRIM} />
        <DialogPrimitive.Content
          aria-label={t('settings.title')}
          data-settings-overlay
          data-settings-phone={phone ? 'true' : undefined}
          onOpenAutoFocus={(event) => {
            if (!activeRef.current) return
            event.preventDefault()
            activeRef.current.focus()
          }}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed z-50 flex overflow-hidden',
            phone
              ? cn('inset-0 flex-col rounded-none border-0 bg-background', SAFE_TOP, SAFE_BOTTOM)
              : 'inset-0 m-auto h-[min(90vh,44rem)] w-[min(92vw,64rem)]',
            PANEL_SURFACE,
            PANEL_MOTION,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t('settings.title')}</DialogPrimitive.Title>

          {!phone && (
            <SettingsRail
              section={section}
              onSelect={setSection}
              activeRef={activeRef}
              open={open}
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center gap-2 border-border border-b px-4 py-3 sm:px-5">
              {phone && !atIndex && (
                <button
                  type="button"
                  data-settings-back
                  onClick={showIndex}
                  aria-label={t('action.back')}
                  className={cn(
                    '-ml-2 flex shrink-0 items-center justify-center rounded-control px-2',
                    TAP_TARGET,
                    'text-muted-foreground transition-colors duration-instant hover:bg-surface-2',
                    'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                  )}
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
              )}
              <h2 className="min-w-0 truncate font-semibold text-heading">
                {showingIndex ? t('settings.title') : heading}
              </h2>
              <DialogPrimitive.Close asChild className="ml-auto">
                <CloseButton />
              </DialogPrimitive.Close>
            </header>

            {showingIndex ? (
              <SettingsIndex onSelect={setSection} activeRef={activeRef} />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 [scrollbar-gutter:stable_both-edges]">
                <div className="mx-auto max-w-2xl">
                  <QueryBoundary
                    isPending={section === 'notifications' && notificationPreferences.isPending}
                    isFetching={notificationPreferences.isFetching}
                    isError={section === 'notifications' && notificationPreferences.isError}
                    error={notificationPreferences.error}
                    onRetry={() => notificationPreferences.refetch()}
                    hasData={
                      section !== 'notifications' || notificationPreferences.data !== undefined
                    }
                  >
                    <CrossfadeSwap swapKey={section} direction={direction} className="w-full">
                      <SettingsPanel
                        section={section}
                        user={user}
                        notificationPreferences={notificationPreferences.data ?? []}
                      />
                    </CrossfadeSwap>
                  </QueryBoundary>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
