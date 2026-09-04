import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  BrandMark,
  DashedCircle,
  FigureFrame,
} from '@/shared/ui/data-display/empty-figures/figure-frame'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Button } from '@/shared/ui/primitives/button'

function ProfileMissingFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <DashedCircle />
      <BrandMark />
    </FigureFrame>
  )
}

export function ProfileMissing({ handle }: { handle?: string }) {
  const { t } = useTranslation()

  return (
    <EmptyState
      title={t('profile.publicNotFound')}
      heading
      description={
        handle ? t('profile.publicNotFoundHandle', { handle }) : t('profile.publicNotFoundHint')
      }
      figure={ProfileMissingFigure}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('action.home')}</Link>
        </Button>
      }
    />
  )
}
