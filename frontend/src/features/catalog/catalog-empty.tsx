import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/primitives/button'

function CatalogEmptyFigure({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 104"
      role="img"
      aria-label={label}
      className="h-32 w-auto text-foreground"
    >
      <rect
        x="14"
        y="20"
        width="172"
        height="64"
        rx="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeDasharray="6 10"
        strokeLinecap="round"
        opacity="0.25"
      />
      <g className="text-logo" transform="translate(66 18)">
        <path
          d="M6 34h56"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="6" cy="34" r="6" fill="currentColor" opacity="0.4" />
        <circle cx="62" cy="34" r="6" fill="currentColor" opacity="0.4" />
        <circle
          cx="34"
          cy="34"
          r="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray="11 9"
          className="motion-safe:animate-[spin_9s_linear_infinite] [transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  )
}

export function CatalogEmpty({
  filtered,
  onResetFilters,
}: {
  filtered: boolean
  onResetFilters: () => void
}) {
  const { t } = useTranslation('event')
  const title = filtered ? t('catalog.empty.filteredTitle') : t('catalog.empty.title')
  const hint = filtered ? t('catalog.empty.filteredHint') : t('catalog.empty.hint')

  return (
    <div className="flex min-h-[24rem] flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <CatalogEmptyFigure label={title} />
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-screen">{title}</h2>
        <p className="text-copy text-muted-foreground">{hint}</p>
      </div>
      {filtered && (
        <Button variant="outline" onClick={onResetFilters}>
          {t('catalog.empty.reset')}
        </Button>
      )}
    </div>
  )
}
