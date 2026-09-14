import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfileLinks } from '@/entities/user/profile.queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/overlays/dialog'
import { Button } from '@/shared/ui/primitives/button'
import { AddProfileLink } from './add-profile-link'
import { EditProfileLink } from './edit-profile-link'
import { ProfileLinksList } from './profile-links-list'

const LINK_LIMIT = 10

export function ProfileLinksCard() {
  const { t } = useTranslation()
  const links = useProfileLinks()
  const items = links.data ?? []
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = items.find((link) => link.id === editingId) ?? null
  const full = items.length >= LINK_LIMIT

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>{t('profile.links.title')}</CardTitle>
          <Button type="button" disabled={full} onClick={() => setAdding(true)}>
            {t('profile.links.add')}
          </Button>
        </CardHeader>
        {items.length === 0 ? null : (
          <CardContent className="flex flex-col gap-3 pt-0 pb-5">
            <ProfileLinksList links={items} editingId={editingId} onEdit={setEditingId} />
            {full ? (
              <p className="text-meta text-muted-foreground">{t('profile.links.limitReached')}</p>
            ) : null}
          </CardContent>
        )}
      </Card>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.links.addTitle')}</DialogTitle>
          </DialogHeader>
          <AddProfileLink disabled={full} onAdded={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(next) => next || setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.links.editTitle')}</DialogTitle>
          </DialogHeader>
          {editing === null ? null : (
            <EditProfileLink key={editing.id} link={editing} onDone={() => setEditingId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
