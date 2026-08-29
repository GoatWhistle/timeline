import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/shared/api/session'
import { useReturnFocus } from '@/shared/hooks/use-return-focus/use-return-focus'
import { cn } from '@/shared/styling/class-names/class-names'
import { Button } from '@/shared/ui/primitives/button'
import { SETTINGS_SECTIONS } from './sections'
import { SettingsPanel } from './settings-panels'
import { useSettingsOverlay } from './use-settings-overlay'

export function SettingsOverlay() {
  const { t } = useTranslation()
  const { user } = useSession()
  const { open, section, setSection, closeSettings } = useSettingsOverlay()
  const activeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useReturnFocus(open)

  useEffect(() => {
    if (open) activeRef.current?.focus()
  }, [open])

  if (!user) return null

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
            'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          aria-label={t('settings.title')}
          onCloseAutoFocus={returnFocus}
          className={cn(
            'fixed inset-0 z-50 m-auto flex h-[min(90vh,44rem)] w-[min(92vw,64rem)] overflow-hidden',
            'rounded-surface border border-border bg-background shadow-lg',
            'data-[state=open]:motion-safe:animate-in data-[state=open]:motion-safe:fade-in-0',
            'data-[state=closed]:motion-safe:animate-out data-[state=closed]:motion-safe:fade-out-0',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t('settings.title')}</DialogPrimitive.Title>

          <nav
            aria-label={t('settings.title')}
            className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-border border-r bg-card p-2"
          >
            <p className="px-3 py-2 font-semibold text-heading">{t('settings.title')}</p>
            {SETTINGS_SECTIONS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                ref={section === id ? activeRef : undefined}
                aria-current={section === id ? 'page' : undefined}
                onClick={() => setSection(id)}
                className={cn(
                  'flex h-row items-center gap-2 rounded-control px-3 text-left text-copy',
                  'transition-colors duration-instant',
                  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
                  section === id
                    ? 'bg-accent-surface font-medium text-accent-surface-foreground'
                    : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {t(labelKey)}
              </button>
            ))}
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="max-w-2xl">
                <SettingsPanel section={section} user={user} />
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
