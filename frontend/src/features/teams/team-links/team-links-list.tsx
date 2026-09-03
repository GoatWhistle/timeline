import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  useRemoveTeamEventLink,
  useReorderTeamEventLinks,
} from '@/entities/team/team-links.queries'
import { moveItem } from '@/features/profile/profile-links-card/reorder'
import type { TeamEventLink } from '@/shared/api/types.gen'
import { TeamLinkRow } from './team-link-row'

export type TeamLinksListProps = {
  teamId: string
  eventId: string
  links: TeamEventLink[]
  canWrite: boolean
  editingId?: string | null
  onEdit?: (id: string) => void
}

export function TeamLinksList({
  teamId,
  eventId,
  links,
  canWrite,
  editingId = null,
  onEdit,
}: TeamLinksListProps) {
  const { t } = useTranslation('team')
  const [order, setOrder] = useState(links)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const reorder = useReorderTeamEventLinks(teamId, eventId)
  const remove = useRemoveTeamEventLink(teamId, eventId)
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
      .map((link) => known.get(link.id) as TeamEventLink)
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

  function persist(next: TeamEventLink[]) {
    setOrder(next)
    reorder.mutate(
      next.map((link) => link.id),
      {
        onError: () => {
          setOrder(links)
          toast.error(t('links.reorderFailed'))
        },
      },
    )
  }

  function move(from: number, to: number) {
    const link = order[from]
    if (link === undefined || to < 0 || to >= order.length) return
    focusAfterMove.current = link.id
    setAnnouncement(t('links.position', { current: to + 1, total: order.length }))
    persist(moveItem(order, from, to))
  }

  if (order.length === 0) {
    return <p className="text-meta text-muted-foreground">{t('links.empty')}</p>
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol ref={listRef} className="flex flex-col gap-2" aria-label={t('links.listLabel')}>
        {order.map((link, index) => (
          <TeamLinkRow
            key={link.id}
            link={link}
            index={index}
            total={order.length}
            canWrite={canWrite}
            isDragged={dragIndex === index}
            isEditing={editingId === link.id}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onEdit={() => onEdit?.(link.id)}
            onRemove={() =>
              remove.mutate(link.id, {
                onError: () => toast.error(t('links.removeFailed')),
              })
            }
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => {
              if (!canWrite || dragIndex === null || dragIndex === index) return
              setOrder(moveItem(order, dragIndex, index))
              setDragIndex(index)
            }}
            onDragEnd={() => {
              setDragIndex(null)
              persist(order)
            }}
          />
        ))}
      </ol>
    </>
  )
}
