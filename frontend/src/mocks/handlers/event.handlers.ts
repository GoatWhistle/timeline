import { HttpResponse, http } from 'msw'
import type { EventCard, MyEventItem, RegistrationPublic } from '@/shared/api/types.gen'
import {
  eventState,
  events,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
  withState,
} from '../fixtures'
import { requireUser } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'
import { assignmentsOf, nextStageOf, stagesOf, statusShortOf } from './event.helpers'

export const eventHandlers = [
  http.get(`${API}/me/events`, ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const url = new URL(request.url)
    const includeArchived = url.searchParams.get('include_archived') === 'true'
    const stateFilter = url.searchParams.get('state')

    const items: MyEventItem[] = assignmentsOf(user.id)
      .map((participant) => {
        const event = events.find((item) => item.id === participant.event_id)
        if (!event?.published_at) return null

        const state = eventState(event)
        const registration = registrations.find((item) => item.event_id === event.id)

        const item: MyEventItem = {
          id: event.id,
          title: event.title,
          start_at: event.start_at,
          end_at: event.end_at,
          state,
          team_role: participant.team_role,
          ...(event.organizer ? { organizer: event.organizer } : {}),
          ...(nextStageOf(event.id) ? { next_stage: nextStageOf(event.id) } : {}),
          ...(registration?.deadline_at ? { registration_deadline: registration.deadline_at } : {}),
          ...(registration?.url ? { registration_url: registration.url } : {}),
          ...(statusShortOf(participant.id)
            ? { registration_status: statusShortOf(participant.id) }
            : {}),
        }
        return item
      })
      .filter((item): item is MyEventItem => item !== null)
      .filter((item) => (includeArchived ? true : item.state !== 'ARCHIVED'))
      .filter((item) => (stateFilter ? item.state === stateFilter : true))
      .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))

    return HttpResponse.json(paginate(items, url))
  }),

  http.get(`${API}/events/:id`, ({ params }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const id = String(params.id)
    const event = events.find((item) => item.id === id)
    if (!event) return notFound()

    const participant = participants.find(
      (item) => item.event_id === id && item.user.id === user.id,
    )
    if (!participant && !user.is_admin) return notFound()
    if (!event.published_at && !user.is_admin) return notFound()

    const state = eventState(event)
    const registration = registrations.find((item) => item.event_id === id)
    const status = participant ? statusShortOf(participant.id) : undefined

    const registrationPublic: RegistrationPublic | undefined = registration
      ? {
          url: registration.url,
          state: registration.state,
          ...(registration.deadline_at ? { deadline_at: registration.deadline_at } : {}),
          ...(registration.description ? { description: registration.description } : {}),
        }
      : undefined

    const canMarkDone =
      Boolean(participant) &&
      participant?.participation_status === 'ASSIGNED' &&
      registration?.state === 'ACTIVE' &&
      status?.status === 'TODO' &&
      state !== 'ARCHIVED'

    const card: EventCard = {
      event: {
        ...withState(event),
        ...(user.is_admin ? {} : { notes: undefined }),
      },
      stages: stagesOf(id),
      can_mark_done: canMarkDone,
      ...(participant?.team_role ? { team_role: participant.team_role } : {}),
      ...(nextStageOf(id) ? { next_stage: nextStageOf(id) } : {}),
      ...(registrationPublic ? { registration: registrationPublic } : {}),
      ...(status ? { registration_status: status } : {}),
    }
    return HttpResponse.json(card)
  }),

  http.get(`${API}/events/:id/stages`, ({ params }) => {
    const { deny } = requireUser()
    if (deny) return deny
    return HttpResponse.json(stagesOf(String(params.id)))
  }),

  http.post(`${API}/events/:id/registration/done`, ({ params }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const participant = participants.find(
      (item) => item.event_id === String(params.id) && item.user.id === user.id,
    )
    if (!participant) return notFound()

    const status = registrationStatuses.find((item) => item.participant_id === participant.id)
    if (!status) return notFound()
    if (status.status !== 'TODO') {
      return errorResponse(409, 'invalid_transition', 'Статус уже изменён')
    }

    status.status = 'DONE'
    status.registered_at = nowIso()
    status.last_change_source = 'USER'
    status.last_changed_by_user_id = user.id
    status.updated_at = nowIso()
    return HttpResponse.json(status)
  }),
]
