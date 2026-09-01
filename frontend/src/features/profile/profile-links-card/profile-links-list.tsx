import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDeleteProfileLink, useReorderProfileLinks } from '@/entities/user/profile.queries'
import type { ProfileLink } from '@/shared/api/types.gen'
import { EditProfileLink } from './edit-profile-link'
import { ProfileLinkRow } from './profile-link-row'
import { moveItem } from './reorder'

export function ProfileLinksList({ links }: { links: ProfileLink[] }) {
  const { t } = useTranslation()
  const [order, setOrder] = useState(links)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const reorder = useReorderProfileLinks()
  const remove = useDeleteProfileLink()
  const listRef = useRef<HTMLOListElement>(null)
  const focusAfterMove = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const membership = links
    .map((link) => link.id)
    .sort()
    .join(',')
  const [syncedMembership, setSyncedMembership] = useState(membership)

  if (membership !== syncedMembership) {
    const known = new Map(links.map((link) => [link.id, link]))
    const kept = order
      .filter((link) => known.has(link.id))
      .map((link) => known.get(link.id) as ProfileLink)
    const added = links.filter((link) => !order.some((item) => item.id === link.id))
    setSyncedMembership(membership)
    setOrder([...kept, ...added])
  }

  useEffect(() => {
    const id = focusAfterMove.current
    if (id === null || listRef.current === null) return
    focusAfterMove.current = null
    const button = listRef.current.querySelector<HTMLButtonElement>(`[data-focus-id="${id}"]`)
    button?.focus()
  })

  function persist(next: ProfileLink[]) {
    setOrder(next)
    reorder.mutate(
      next.map((link) => link.id),
      {
        onError: () => {
          setOrder(links)
          toast.error(t('profile.links.reorderFailed'))
        },
      },
    )
  }

  function move(from: number, to: number) {
    const link = order[from]
    if (link === undefined || to < 0 || to >= order.length) return
    focusAfterMove.current = link.id
    setAnnouncement(t('profile.links.position', { current: to + 1, total: order.length }))
    persist(moveItem(order, from, to))
  }

  function onDrop() {
    setDragIndex(null)
    persist(order)
  }

  if (order.length === 0) {
    return <p className="text-meta text-muted-foreground">{t('profile.links.empty')}</p>
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol ref={listRef} className="flex flex-col gap-2" aria-label={t('profile.links.listLabel')}>
        {order.map((link, index) =>
          editingId === link.id ? (
            <li key={link.id}>
              <EditProfileLink
                key={`${link.url}|${link.label ?? ''}`}
                link={link}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <ProfileLinkRow
              key={link.id}
              link={link}
              index={index}
              total={order.length}
              isDragged={dragIndex === index}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onEdit={() => setEditingId(link.id)}
              onRemove={() =>
                remove.mutate(link.id, {
                  onError: () => toast.error(t('profile.links.removeFailed')),
                })
              }
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => {
                if (dragIndex === null || dragIndex === index) return
                setOrder(moveItem(order, dragIndex, index))
                setDragIndex(index)
              }}
              onDragEnd={onDrop}
            />
          ),
        )}
      </ol>
    </>
  )
}
