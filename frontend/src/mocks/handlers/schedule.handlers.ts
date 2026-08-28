import { HttpResponse, http } from 'msw'
import type {
  EventResponse,
  ScheduleResponse,
  ScheduleRow,
  StageResponse,
} from '@/shared/api/types.gen'
import { eventState, events, participants, registrations, stages } from '../fixtures'
import { requireAdmin, requireUser } from '../guards'
import { API } from '../http'

function deriveFormat(event: EventResponse, items: StageResponse[]): EventResponse['format'] {
  let offline = event.format !== 'ONLINE'
  let online = event.format !== 'OFFLINE'
  for (const item of items) {
    if (!item.format) continue
    if (item.place.format === 'ONLINE') online = true
    else offline = true
  }
  if (offline && online) return 'HYBRID'
  return offline ? 'OFFLINE' : 'ONLINE'
}

function scheduleRows(userId: string | null): ScheduleRow[] {
  return events
    .filter((event) => Boolean(event.published_at))
    .filter((event) => {
      if (!userId) return true
      return participants.some(
        (item) =>
          item.event_id === event.id &&
          item.user.id === userId &&
          item.participation_status === 'ASSIGNED',
      )
    })
    .map((event) => {
      const registration = registrations.find((item) => item.event_id === event.id)
      const participant = userId
        ? participants.find((item) => item.event_id === event.id && item.user.id === userId)
        : undefined

      const eventStages = stages
        .filter((item) => item.event_id === event.id)
        .sort((a, b) => a.sort_order - b.sort_order)

      const row: ScheduleRow = {
        event_id: event.id,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        state: eventState(event),
        effective_format: deriveFormat(event, eventStages),
        stages: eventStages.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          start_at: item.start_at,
          end_at: item.end_at,
          place: item.place,
        })),
        ...(registration?.deadline_at ? { registration_deadline: registration.deadline_at } : {}),
        ...(participant?.team_role ? { team_role: participant.team_role } : {}),
      }
      return row
    })
}

function scheduleRange(rows: ScheduleRow[], request: Request) {
  const url = new URL(request.url)
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')
  if (fromParam && toParam) return { from: fromParam, to: toParam }

  const starts = rows.map((row) => Date.parse(row.start_at))
  const ends = rows.map((row) => Date.parse(row.end_at))
  const now = Date.now()
  const from = starts.length ? Math.min(...starts) : now
  const to = ends.length ? Math.max(...ends) : now
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() }
}

export const scheduleHandlers = [
  http.get(`${API}/me/schedule`, ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny
    const rows = scheduleRows(user.id).filter((row) => row.state !== 'ARCHIVED')
    const response: ScheduleResponse = { range: scheduleRange(rows, request), rows }
    return HttpResponse.json(response)
  }),

  http.get(`${API}/admin/schedule`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const includeArchived = url.searchParams.get('include_archived') === 'true'
    const stateFilter = url.searchParams.get('state')
    const participantId = url.searchParams.get('participant_user_id')

    const rows = scheduleRows(participantId)
      .filter((row) => (includeArchived ? true : row.state !== 'ARCHIVED'))
      .filter((row) => (stateFilter ? row.state === stateFilter : true))

    const response: ScheduleResponse = { range: scheduleRange(rows, request), rows }
    return HttpResponse.json(response)
  }),
]
