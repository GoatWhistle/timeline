import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

export const EVENT_OVERLAY_PARAM = 'card'

export function useEventOverlay() {
  const [params, setParams] = useSearchParams()
  const raw = params.get(EVENT_OVERLAY_PARAM)
  const eventId = raw !== null && raw !== '' ? raw : null

  const openEventCard = useCallback(
    (id: string) => {
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous)
          updated.set(EVENT_OVERLAY_PARAM, id)
          return updated
        },
        { replace: false },
      )
    },
    [setParams],
  )

  const closeEventCard = useCallback(() => {
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        updated.delete(EVENT_OVERLAY_PARAM)
        return updated
      },
      { replace: false },
    )
  }, [setParams])

  return { eventId, open: eventId !== null, openEventCard, closeEventCard }
}
