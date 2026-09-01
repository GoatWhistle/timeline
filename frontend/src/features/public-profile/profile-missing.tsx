import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/shared/ui/primitives/button'

function ProfileMissingFigure({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 104"
      role="img"
      aria-label={label}
      className="h-32 w-auto text-foreground"
    >
      <circle
        cx="100"
        cy="52"
        r="42"
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

export function ProfileMissing({ handle }: { handle?: string }) {
  const { t } = useTranslation()
  const title = t('profile.publicNotFound')

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <ProfileMissingFigure label={title} />
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-screen">{title}</h1>
        <p className="text-copy text-muted-foreground">
          {handle ? t('profile.publicNotFoundHandle', { handle }) : t('profile.publicNotFoundHint')}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">{t('action.home')}</Link>
      </Button>
    </div>
  )
}
