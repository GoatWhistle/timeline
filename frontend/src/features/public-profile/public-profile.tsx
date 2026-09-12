import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { fullName } from '@/entities/user/person-name/person-name'
import { UserAvatar } from '@/entities/user/user-avatar/user-avatar'
import { api, unwrap } from '@/shared/api/client'
import type { PublicProfileResponse } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { useLocale } from '@/shared/i18n/i18n-context'
import { MarkdownView } from '@/shared/markdown/markdown-view'
import { profileNickname } from '@/shared/routing/public-profile-path'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { ProfileMissing } from './profile-missing'

function publicProfileQuery(nickname: string) {
  return {
    queryKey: ['public-profile', nickname] as const,
    queryFn: () => unwrap(api.GET('/profiles/{nickname}', { params: { path: { nickname } } })),
    retry: false,
  }
}

export function PublicProfilePage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { handle = '' } = useParams()
  const nickname = profileNickname(handle) ?? ''
  const query = useQuery<PublicProfileResponse>({
    ...publicProfileQuery(nickname),
    enabled: nickname !== '',
  })

  if (query.isPending) {
    return <div className="p-8 text-muted-foreground">{t('state.loading')}</div>
  }

  if (query.isError || !query.data) {
    return <ProfileMissing handle={nickname === '' ? undefined : nickname} />
  }

  const profile = query.data
  const name = fullName(profile, locale)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Card>
        <CardContent className="flex items-center gap-4">
          <UserAvatar
            seed={profile.nickname}
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={profile.avatar_url}
            className="size-16 text-copy"
          />
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-heading">{name}</h1>
            <p className="truncate text-caption text-muted-foreground">@{profile.nickname}</p>
            {profile.bio ? <MarkdownView source={profile.bio} className="mt-2" /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.publicEvents')}</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.events.length === 0 ? (
            <p className="text-muted-foreground">{t('profile.publicNoEvents')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.events.map((event) => (
                <li key={event.id} className="flex flex-col">
                  <span className="font-medium text-copy">{event.title}</span>
                  <span className="text-caption text-muted-foreground">
                    {formatDate(event.start_at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
