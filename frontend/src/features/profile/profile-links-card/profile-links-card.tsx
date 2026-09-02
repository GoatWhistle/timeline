import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfileLinks } from '@/entities/user/profile.queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { AddProfileLink } from './add-profile-link'
import { EditProfileLink } from './edit-profile-link'
import { ProfileLinksList } from './profile-links-list'

const LINK_LIMIT = 10

export function ProfileLinksCard() {
  const { t } = useTranslation()
  const links = useProfileLinks()
  const items = links.data ?? []
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = items.find((link) => link.id === editingId) ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.links.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ProfileLinksList
          links={items}
          editingId={editing === null ? null : editing.id}
          onEdit={setEditingId}
        />

        <section
          aria-label={editing === null ? t('profile.links.addTitle') : t('profile.links.editTitle')}
          className="flex flex-col gap-4 rounded-control border border-border bg-surface-1 p-4"
        >
          <h3 className="font-medium text-caption text-muted-foreground uppercase tracking-wide">
            {editing === null ? t('profile.links.addTitle') : t('profile.links.editTitle')}
          </h3>
          {editing === null ? (
            <AddProfileLink disabled={items.length >= LINK_LIMIT} />
          ) : (
            <EditProfileLink key={editing.id} link={editing} onDone={() => setEditingId(null)} />
          )}
        </section>
      </CardContent>
    </Card>
  )
}
