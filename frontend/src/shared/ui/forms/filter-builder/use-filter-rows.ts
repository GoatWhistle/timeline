import { useState } from 'react'

export function useFilterRows<F extends string>(
  all: readonly F[],
  isActive: (field: F) => boolean,
) {
  const [order, setOrder] = useState<F[]>([])
  const [drafts, setDrafts] = useState<F[]>([])
  const [fresh, setFresh] = useState<F | null>(null)

  const shown = (field: F) => isActive(field) || drafts.includes(field)
  const rows = [
    ...all.filter((field) => shown(field) && !order.includes(field)),
    ...order.filter(shown),
  ]
  const available = all.filter((field) => !shown(field))

  return {
    rows,
    available,
    fresh,
    add(field: F) {
      setOrder((current) => [...current.filter((item) => item !== field), field])
      setDrafts((current) => [...current.filter((item) => item !== field), field])
      setFresh(field)
    },
    swap(from: F, to: F) {
      setOrder(rows.map((item) => (item === from ? to : item)))
      setDrafts((current) => [...current.filter((item) => item !== from && item !== to), to])
      setFresh(to)
    },
    remove(field: F) {
      setOrder((current) => current.filter((item) => item !== field))
      setDrafts((current) => current.filter((item) => item !== field))
      setFresh(null)
    },
    begin() {
      setDrafts(all.filter(isActive))
      setFresh(null)
    },
    settle() {
      setOrder([])
      setDrafts([])
      setFresh(null)
    },
  }
}
