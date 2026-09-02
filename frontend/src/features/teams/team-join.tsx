import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useJoinByLink } from '@/entities/team/team.queries'
import { isApiError } from '@/shared/api/errors'
import { BrokenLinkFigure } from '@/shared/ui/data-display/empty-figures/people-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Spinner } from '@/shared/ui/data-display/spinner'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Button } from '@/shared/ui/primitives/button'

export function TeamJoinPage() {
  const { t } = useTranslation('team')
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const join = useJoinByLink()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current || token === '') return
    attempted.current = true
    join
      .mutateAsync({ token })
      .then((detail) => {
        toast.success(t('accepted'))
        navigate(`/teams/${detail.team.id}`, { replace: true })
      })
      .catch((error: unknown) => {
        toast.error(isApiError(error) ? error.localizedMessage : t('linkInvalid'))
      })
  }, [token, join, navigate, t])

  return (
    <div>
      <PageHeader title={t('joinTitle')} />
      {join.isError ? (
        <EmptyState
          title={t('linkInvalid')}
          description={t('linkInvalidHint')}
          figure={BrokenLinkFigure}
          action={
            <Button variant="outline" onClick={() => navigate('/teams')}>
              {t('title')}
            </Button>
          }
        />
      ) : (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
    </div>
  )
}
