import { HttpResponse, http } from 'msw'
import type {
  AuditResponse,
  CreateInviteRequest,
  DeadlineItem,
  InviteResponse,
  TimelineResponse,
  TimelineRow,
  UserSummary,
} from '@/shared/api/types.gen'
import {
  auditLog,
  findUserByEmail,
  hackathonState,
  hackathons,
  invites,
  nextId,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
  stages,
  users,
} from '../db'
import { requireAdmin, requireUser } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

const summary = (id: string): UserSummary | undefined => {
  const found = users.find((item) => item.id === id)
  if (!found) return undefined
  return {
    id: found.id,
    display_name: found.display_name,
    email: found.email,
    is_active: found.is_active,
  }
}

function timelineRows(userId: string | null): TimelineRow[] {
  return hackathons
    .filter((hackathon) => Boolean(hackathon.published_at))
    .filter((hackathon) => {
      if (!userId) return true
      return participants.some(
        (item) =>
          item.hackathon_id === hackathon.id &&
          item.user.id === userId &&
          item.participation_status === 'ASSIGNED',
      )
    })
    .map((hackathon) => {
      const registration = registrations.find((item) => item.hackathon_id === hackathon.id)
      const participant = userId
        ? participants.find((item) => item.hackathon_id === hackathon.id && item.user.id === userId)
        : undefined

      const row: TimelineRow = {
        hackathon_id: hackathon.id,
        title: hackathon.title,
        start_at: hackathon.start_at,
        end_at: hackathon.end_at,
        state: hackathonState(hackathon),
        stages: stages
          .filter((item) => item.hackathon_id === hackathon.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            start_at: item.start_at,
            end_at: item.end_at,
          })),
        ...(registration?.deadline_at ? { registration_deadline: registration.deadline_at } : {}),
        ...(participant?.team_role ? { team_role: participant.team_role } : {}),
      }
      return row
    })
}

function timelineRange(rows: TimelineRow[], request: Request) {
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

export const directoryHandlers = [
  http.get(`${API}/me/timeline`, ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny
    // Пользовательская шкала: только назначенные опубликованные неархивные.
    const rows = timelineRows(user.id).filter((row) => row.state !== 'ARCHIVED')
    const response: TimelineResponse = { range: timelineRange(rows, request), rows }
    return HttpResponse.json(response)
  }),

  http.get(`${API}/admin/timeline`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const includeArchived = url.searchParams.get('include_archived') === 'true'
    const stateFilter = url.searchParams.get('state')
    const participantId = url.searchParams.get('participant_user_id')

    const rows = timelineRows(participantId)
      .filter((row) => (includeArchived ? true : row.state !== 'ARCHIVED'))
      .filter((row) => (stateFilter ? row.state === stateFilter : true))

    const response: TimelineResponse = { range: timelineRange(rows, request), rows }
    return HttpResponse.json(response)
  }),

  http.get(`${API}/admin/users`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const query = (url.searchParams.get('query') ?? '').trim().toLowerCase()
    const items: UserSummary[] = users
      .filter((item) =>
        query
          ? item.display_name.toLowerCase().includes(query) ||
            item.email.toLowerCase().includes(query)
          : true,
      )
      .map((item) => ({
        id: item.id,
        display_name: item.display_name,
        email: item.email,
        is_active: item.is_active,
      }))

    return HttpResponse.json(paginate(items, url))
  }),

  http.post(`${API}/admin/users/:id/activate`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.is_active = true
    return HttpResponse.json({ message: 'Учётная запись активирована' })
  }),

  http.post(`${API}/admin/users/:id/deactivate`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.is_active = false
    found.telegram_linked = false
    found.telegram_username = undefined
    return HttpResponse.json({ message: 'Учётная запись деактивирована' })
  }),

  http.delete(`${API}/admin/users/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    // Удаление необратимо: данные обезличиваются, ссылки участия сохраняются.
    found.display_name = 'Удалённый пользователь'
    found.email = `deleted-${found.id}@example.invalid`
    found.is_active = false
    found.telegram_linked = false
    found.telegram_username = undefined
    return HttpResponse.json({ message: 'Учётная запись удалена' })
  }),

  http.get(`${API}/admin/invites`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    return HttpResponse.json(paginate(invites, new URL(request.url)))
  }),

  http.post(`${API}/admin/invites`, async ({ request }) => {
    const { user, deny } = requireAdmin()
    if (deny) return deny

    const body = (await request.json()) as CreateInviteRequest
    const email = body.email?.trim().toLowerCase()
    if (!email) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'email', message: 'Укажите адрес' },
      ])
    }
    // Приглашение существующему пользователю отклоняется независимо от is_active.
    if (findUserByEmail(email)) {
      return errorResponse(409, 'user_exists', 'Пользователь с таким адресом уже зарегистрирован')
    }

    // Предыдущее непринятое приглашение отзывается, затем создаётся новое.
    for (const invite of invites) {
      if (invite.email === email && !invite.accepted_at && !invite.revoked_at) {
        invite.revoked_at = nowIso()
      }
    }

    const created: InviteResponse = {
      id: nextId(),
      email,
      created_by_user_id: user.id,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      created_at: nowIso(),
    }
    invites.push(created)
    return HttpResponse.json(
      { invite: created, accept_link: `https://tracker.example.com/invite/mock-${created.id}` },
      { status: 201 },
    )
  }),

  http.post(`${API}/admin/invites/:id/revoke`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = invites.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.accepted_at) return errorResponse(409, 'already_accepted', 'Приглашение уже принято')
    found.revoked_at = nowIso()
    return HttpResponse.json({ message: 'Приглашение отозвано' })
  }),

  http.get(`${API}/invites/:token`, ({ params }) => {
    const token = String(params.token)
    const found = invites.find((item) => `mock-${item.id}` === token)
    if (!found) return HttpResponse.json({ valid: false })
    const valid =
      !found.accepted_at && !found.revoked_at && Date.parse(found.expires_at) > Date.now()
    return HttpResponse.json({ valid, email: found.email, expires_at: found.expires_at })
  }),

  http.get(`${API}/admin/audit`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const entityType = url.searchParams.get('entity_type')
    const actor = url.searchParams.get('actor_user_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const items: AuditResponse[] = auditLog
      .filter((item) => (action ? item.action === action : true))
      .filter((item) => (entityType ? item.entity_type === entityType : true))
      .filter((item) => (actor ? item.actor_user_id === actor : true))
      .filter((item) => (from ? Date.parse(item.created_at) >= Date.parse(from) : true))
      .filter((item) => (to ? Date.parse(item.created_at) <= Date.parse(to) : true))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

    return HttpResponse.json(paginate(items, url))
  }),

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
        const hackathon = hackathons.find((item) => item.id === status.hackathon_id)
        if (!registration?.deadline_at || !hackathon) return []
        const deadline = Date.parse(registration.deadline_at)
        if (deadline < Date.now() || deadline > limit) return []
        const item: DeadlineItem = {
          hackathon_id: hackathon.id,
          hackathon_title: hackathon.title,
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
        const hackathon = hackathons.find((item) => item.id === status.hackathon_id)
        if (!registration?.deadline_at || !hackathon) return []
        const deadline = Date.parse(registration.deadline_at)
        if (deadline >= Date.now()) return []
        const item: DeadlineItem = {
          hackathon_id: hackathon.id,
          hackathon_title: hackathon.title,
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

  http.get(`${API}/ops/worker-heartbeat`, () => {
    const { deny } = requireAdmin()
    if (deny) return deny
    return HttpResponse.json({
      healthy: true,
      pending_count: 4,
      processing_count: 1,
      failed_count: 0,
      undeliverable_count: 0,
      oldest_pending_age_seconds: 42,
      worker_last_run_at: nowIso(),
      scheduler_last_run_at: nowIso(),
    })
  }),

  http.get(`${API}/healthz`, () => HttpResponse.json({ status: 'ok', time: nowIso() })),
  http.get(`${API}/readyz`, () => HttpResponse.json({ status: 'ok', database: 'ok' })),
]
