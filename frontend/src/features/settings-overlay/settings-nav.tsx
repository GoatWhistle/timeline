import { ChevronRight } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TAP_TARGET } from '@/shared/ui/layout/mobile/mobile-state'
import { SlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/sliding-indicator'
import { useSlidingIndicator } from '@/shared/ui/navigation/sliding-indicator/use-sliding-indicator'
import { SETTINGS_SECTIONS, type SettingsSectionId } from './sections'

const RAIL_ITEM = cn(
  'relative z-10 flex h-row items-center gap-2 rounded-control px-3 text-left text-copy',
  'transition-colors duration-base ease-out',
  'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
)

export function SettingsRail({
  section,
  onSelect,
  activeRef,
  open,
}: {
  section: SettingsSectionId
  onSelect: (next: SettingsSectionId) => void
  activeRef: RefObject<HTMLButtonElement | null>
  open: boolean
}) {
  const { t } = useTranslation()
  const { containerRef, box } = useSlidingIndicator<HTMLDivElement>(section, 'y', open)

  return (
    <nav
      aria-label={t('settings.title')}
      data-settings-rail
      className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-border border-r bg-surface-1 p-2"
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
            onClick={() => onSelect(id)}
            className={cn(
              RAIL_ITEM,
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
  )
}

export function SettingsIndex({
  onSelect,
  activeRef,
}: {
  onSelect: (next: SettingsSectionId) => void
  activeRef: RefObject<HTMLButtonElement | null>
}) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('settings.title')}
      data-settings-index
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3"
    >
      {SETTINGS_SECTIONS.map(({ id, labelKey, icon: Icon }, order) => (
        <button
          key={id}
          type="button"
          ref={order === 0 ? activeRef : undefined}
          data-settings-index-item={id}
          onClick={() => onSelect(id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-control px-2 text-copy',
            TAP_TARGET,
            'transition-colors duration-instant hover:bg-surface-2',
            'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">{t(labelKey)}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
