import { Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { fullName } from '@/entities/user/person-name/person-name'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { usePublicProfile } from '@/entities/user/public-profile.queries'
import { UserAvatar } from '@/entities/user/user-avatar/user-avatar'
import { useSession } from '@/shared/api/session'
import type { PublicProfileEvent } from '@/shared/api/types.gen'
import { formatDate } from '@/shared/datetime/datetime'
import { usePageMeta } from '@/shared/hooks/use-page-meta/use-page-meta'
import { useLocale } from '@/shared/i18n/i18n-context'
import { MarkdownView } from '@/shared/markdown/markdown-view'
import { profileNickname, publicProfilePath } from '@/shared/routing/public-profile-path'
import { HistoryFigure } from '@/shared/ui/data-display/empty-figures/personal-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { ActivityHeatmap } from './activity-heatmap'
import { distinctTeamNames, groupEventsByYear } from './event-year-groups'
import { ProfileEventCard } from './profile-event-card'
import { ProfileLinksRow } from './profile-links-row'
import { ProfileMissing } from './profile-missing'
import { ProfileSummary } from './profile-summary'

function PinnedEvents({
  events,
  isOwner,
  onUnpin,
}: {
  events: PublicProfileEvent[]
  isOwner: boolean
  onUnpin: (id: string) => void
}) {
  const { t } = useTranslation()
  if (!events || events.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-copy">{t('publicProfile.pinned.title')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <ProfileEventCard
            key={event.id}
            event={event}
            onUnpin={isOwner ? () => onUnpin(event.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}

export function PublicProfilePage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const { handle = '' } = useParams()
  const nickname = profileNickname(handle) ?? ''
  const { user } = useSession()
  const query = usePublicProfile(nickname)
  const updateProfile = useUpdateProfile()

  const profile = query.data
  const isOwner = Boolean(profile && user?.nickname === profile.nickname)

  usePageMeta({
    title: profile
      ? t('publicProfile.meta.title', {
          name: fullName(profile, locale),
          nickname: profile.nickname,
        })
      : t('app.name'),
    description: profile?.bio,
    image: profile?.avatar_url,
  })

  if (query.isPending) {
    return <div className="p-8 text-muted-foreground">{t('state.loading')}</div>
  }

  if (query.isError || !profile) {
    return <ProfileMissing handle={nickname === '' ? undefined : nickname} />
  }

  const name = fullName(profile, locale)
  const teams = distinctTeamNames(profile.events)
  const yearGroups = groupEventsByYear(profile.events)
  const hasEvents = profile.events.length > 0
  const shareUrl = `${window.location.origin}${publicProfilePath(profile.nickname)}`

  async function share() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t('publicProfile.share'))
    } catch {
      toast.error(t('publicProfile.shareFailed'))
    }
  }

  async function unpin(id: string) {
    const next = (user?.pinned_event_ids ?? []).filter((eventId) => eventId !== id)
    try {
      await updateProfile.mutateAsync({ pinned_event_ids: next })
    } catch {
      toast.error(t('publicProfile.pinned.unpinFailed'))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 lg:flex-row lg:items-start">
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
        <UserAvatar
          seed={profile.nickname}
          firstName={profile.first_name}
          lastName={profile.last_name}
          avatarUrl={profile.avatar_url}
          className="size-24 text-section"
        />
        <div>
          <h1 className="font-semibold text-heading">{name}</h1>
          <p className="text-copy text-muted-foreground">@{profile.nickname}</p>
        </div>
        {profile.bio && <MarkdownView source={profile.bio} />}
        <ProfileLinksRow links={profile.links} />
        <p className="text-caption text-muted-foreground">
          {t('publicProfile.memberSince', { date: formatDate(profile.member_since, locale) })}
        </p>
        <div className="flex flex-col gap-2">
          {isOwner ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/catalog?settings=profile">{t('publicProfile.editProfile')}</Link>
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={share}>
            <Share2 className="size-3.5" aria-hidden="true" />
            {t('publicProfile.share')}
          </Button>
        </div>
        <ProfileSummary summary={profile.summary} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-8">
        {!hasEvents ? (
          <EmptyState
            title={t('publicProfile.empty.title')}
            description={isOwner ? t('publicProfile.empty.ownHint') : t('publicProfile.empty.hint')}
            figure={HistoryFigure}
          />
        ) : (
          <>
            <PinnedEvents events={profile.pinned_events} isOwner={isOwner} onUnpin={unpin} />
            <ActivityHeatmap months={profile.monthly_activity} />
            <section className="flex flex-col gap-4">
              <h2 className="font-semibold text-copy">{t('publicProfile.timeline.title')}</h2>
              {yearGroups.map((group) => (
                <div key={group.year} className="flex flex-col gap-3">
                  <h3 className="text-copy text-muted-foreground">{group.year}</h3>
                  <div className="flex flex-col gap-2">
                    {group.events.map((event) => (
                      <ProfileEventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
            {teams.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-semibold text-copy">{t('publicProfile.teamsSection.title')}</h2>
                <ul className="flex flex-wrap gap-2">
                  {teams.map((teamName) => (
                    <li
                      key={teamName}
                      className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-caption text-copy"
                    >
                      {teamName}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
