import { useTranslation } from 'react-i18next'
import { useProfileLinks } from '@/entities/user/profile.queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { AddProfileLink } from './add-profile-link'
import { ProfileLinksList } from './profile-links-list'

const LINK_LIMIT = 10

export function ProfileLinksCard() {
  const { t } = useTranslation()
  const links = useProfileLinks()
  const items = links.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.links.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-meta text-muted-foreground">{t('profile.links.hint')}</p>
        <ProfileLinksList links={items} />
        <AddProfileLink disabled={items.length >= LINK_LIMIT} />
      </CardContent>
    </Card>
  )
}
