import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BrandMark, FigureFrame } from '@/shared/ui/data-display/empty-figures/figure-frame'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Button } from '@/shared/ui/primitives/button'

function NotFoundFigure({ label }: { label: string }) {
  return (
    <FigureFrame label={label}>
      <text x="2" y="82" fill="currentColor" fontSize="96" fontWeight="600" letterSpacing="-4">
        4
      </text>
      <text x="146" y="82" fill="currentColor" fontSize="96" fontWeight="600" letterSpacing="-4">
        4
      </text>
      <BrandMark />
    </FigureFrame>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <EmptyState
      title={t('page.notFoundTitle')}
      heading
      description={t('page.notFoundHint')}
      figure={NotFoundFigure}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('action.home')}</Link>
        </Button>
      }
    />
  )
}
