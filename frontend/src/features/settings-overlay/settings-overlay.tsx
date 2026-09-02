import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/shared/api/session'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import { PANEL_MOTION, PANEL_SURFACE, SCRIM } from '@/shared/ui/overlays/overlay-chrome'
import { Button } from '@/shared/ui/primitives/button'
import { SETTINGS_SECTIONS } from './sections'
import { SettingsPanel } from './settings-panels'
import { useSettingsOverlay } from './use-settings-overlay'

export function SettingsOverlay() {
  const { t } = useTranslation()
  const { user } = useSession()
  const { open, section, setSection, closeSettings } = useSettingsOverlay()
  const activeRef = useRef<HTMLButtonElement>(null)
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(section, 'y', open)
  const returnFocus = useReturnFocus(open)

  if (!user) return null

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
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            activeRef.current?.focus()
          }}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed inset-0 z-50 m-auto flex h-[min(90vh,44rem)] w-[min(92vw,64rem)] overflow-hidden',
            PANEL_SURFACE,
            PANEL_MOTION,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t('settings.title')}</DialogPrimitive.Title>

          <nav
            aria-label={t('settings.title')}
            className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-border border-r bg-card p-2"
          >
            <p className="px-3 py-2 font-semibold text-heading">{t('settings.title')}</p>
            <div ref={containerRef} className="relative flex flex-col gap-0.5">
              <SlidingIndicator box={box} axis="y" />
              {SETTINGS_SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  ref={section === id ? activeRef : undefined}
                  aria-current={section === id ? 'page' : undefined}
                  data-indicator-item
                  data-indicator-active={section === id ? 'true' : undefined}
                  onClick={() => setSection(id)}
                  className={cn(
                    'relative z-10 flex h-row items-center gap-2 rounded-control px-3 text-left text-copy',
                    'transition-colors duration-base ease-out',
                    'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                    section === id
                      ? 'font-medium text-accent-surface-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center gap-2 border-border border-b px-5 py-3">
              <h2 className="font-semibold text-heading">
                {t(SETTINGS_SECTIONS.find((item) => item.id === section)?.labelKey ?? '')}
              </h2>
              <DialogPrimitive.Close asChild className="ml-auto">
                <Button variant="ghost" size="sm" aria-label={t('action.close')}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </DialogPrimitive.Close>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable_both-edges]">
              <div className="mx-auto max-w-2xl">
                <SettingsPanel section={section} user={user} />
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
