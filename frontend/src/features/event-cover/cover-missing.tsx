import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'

function CoverMissingFigure({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 104"
      role="img"
      aria-label={label}
      className="h-full max-h-24 w-auto text-foreground"
    >
      <rect
        x="16"
        y="14"
        width="168"
        height="76"
        rx="10"
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

export function CoverMissing({
  className,
  labelled = true,
}: {
  className?: string
  labelled?: boolean
}) {
  const { t } = useTranslation('event')
  const label = t('cover.missing')

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-4 py-6 text-center',
        className,
      )}
    >
      <CoverMissingFigure label={label} />
      {labelled ? <p className="text-caption text-muted-foreground">{label}</p> : null}
    </div>
  )
}
