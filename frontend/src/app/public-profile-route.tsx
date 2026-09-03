import { useParams } from 'react-router'
import { isPublicProfileHandle } from '@/shared/routing/public-profile-path'
import { PublicProfilePage } from './lazy-pages'
import { NotFoundPage } from './pages/not-found-page'

export function PublicProfileRoute() {
  const { handle = '' } = useParams()
  if (!isPublicProfileHandle(handle)) return <NotFoundPage />
  return <PublicProfilePage />
}
