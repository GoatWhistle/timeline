import { HttpResponse, http } from 'msw'
import type { DeadlineItem } from '@/shared/api/types.gen'
import { events, registrationStatuses, registrations } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, paginate } from '../http'
import { summary } from '../user-summary'

export const deadlineHandlers = [
  http.get(`${API}/admin/queries/upcoming`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const withinHours = Number.parseInt(url.searchParams.get('within_hours') ?? '72', 10) || 72
    const limit = Date.now() + withinHours * 60 * 60 * 1000

    const items = registrationStatuses
      .filter((status) => status.status === 'TODO')
      .flatMap((status) => {
        const registration = registrations.find((item) => item.id === status.registration_id)
        const event = events.find((item) => item.id === status.event_id)
        if (!registration?.deadline_at || !event) return []
        const deadline = Date.parse(registration.deadline_at)
        if (deadline < Date.now() || deadline > limit) return []
        const item: DeadlineItem = {
          event_id: event.id,
          event_title: event.title,
          participant_id: status.participant_id,
          deadline_at: registration.deadline_at,
          status: status.status,
          user: summary(status.user.id) ?? status.user,
        }
        return [item]
      })

    return HttpResponse.json(paginate(items, url))
  }),

  http.get(`${API}/admin/queries/overdue`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const items = registrationStatuses
      .filter((status) => status.status === 'TODO')
      .flatMap((status) => {
        const registration = registrations.find((item) => item.id === status.registration_id)
        const event = events.find((item) => item.id === status.event_id)
        if (!registration?.deadline_at || !event) return []
        const deadline = Date.parse(registration.deadline_at)
        if (deadline >= Date.now()) return []
        const item: DeadlineItem = {
          event_id: event.id,
          event_title: event.title,
          participant_id: status.participant_id,
          deadline_at: registration.deadline_at,
          status: status.status,
          overdue_minutes: Math.floor((Date.now() - deadline) / 60000),
          user: summary(status.user.id) ?? status.user,
        }
        return [item]
      })

    return HttpResponse.json(paginate(items, new URL(request.url)))
  }),
]
