import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

function NotFoundFigure({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 104"
      role="img"
      aria-label={label}
      className="h-32 w-auto text-foreground"
    >
      <text
        x="2"
        y="82"
        fill="currentColor"
        fontSize="96"
        fontWeight="600"
        letterSpacing="-4"
      >
        4
      </text>
      <text
        x="146"
        y="82"
        fill="currentColor"
        fontSize="96"
        fontWeight="600"
        letterSpacing="-4"
      >
        4
      </text>
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

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <NotFoundFigure label={t('page.notFoundTitle')} />
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-screen">{t('page.notFoundTitle')}</h1>
        <p className="text-copy text-muted-foreground">{t('page.notFoundHint')}</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">{t('action.home')}</Link>
      </Button>
    </div>
  )
}
