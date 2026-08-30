import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { isViewActive, type SavedView, viewSearch } from '@/shared/navigation/saved-view'
import { cn } from '@/shared/styling/class-names/class-names'

export function SavedViewsNav({
  views,
  basePath,
  keys,
}: {
  views: SavedView[]
  basePath: string
  keys?: readonly string[]
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const onList = location.pathname === basePath

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 py-1.5 font-medium text-caption text-muted-foreground uppercase tracking-wide">
        {t('views.legend')}
      </p>
      {views.map((view) => {
        const active = onList && isViewActive(view, location.search, keys)
        return (
          <NavLink
            key={view.id}
            to={{ pathname: basePath, search: viewSearch(view) }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-row items-center rounded-control px-3 text-copy transition-colors duration-instant',
              'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
              active
                ? 'bg-accent-surface font-medium text-accent-surface-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            )}
          >
            {t(view.titleKey)}
          </NavLink>
        )
      })}
    </div>
  )
}
