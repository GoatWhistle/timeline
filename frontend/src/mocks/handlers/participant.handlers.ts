import { HttpResponse, http } from 'msw'
import type { UpdateTeamRoleRequest } from '@/shared/api/types.gen'
import { nowIso, participants } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'
import { attachStatus, ensureStatus } from './participant.helpers'

export const participantHandlers = [
  http.get(`${API}/admin/events/:id/participants`, ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const includeRemoved = url.searchParams.get('include_removed') === 'true'
    const teamRole = (url.searchParams.get('team_role') ?? '').toLowerCase()
    const statusFilter = url.searchParams.get('registration_status')
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()

    const items = participants
      .filter((item) => item.event_id === String(params.id))
      .filter((item) => (includeRemoved ? true : item.participation_status === 'ASSIGNED'))
      .filter((item) => (teamRole ? item.team_role.toLowerCase().includes(teamRole) : true))
      .filter((item) =>
        search
          ? item.user.display_name.toLowerCase().includes(search) ||
            item.user.email.toLowerCase().includes(search)
          : true,
      )
      .map(attachStatus)
      .filter((item) => (statusFilter ? item.registration_status?.status === statusFilter : true))

    return HttpResponse.json(paginate(items, url))
  }),

  http.patch(`${API}/admin/participants/:id/team-role`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = participants.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as UpdateTeamRoleRequest
    if (!body.team_role?.trim()) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'team_role', message: 'Укажите роль' },
      ])
    }
    found.team_role = body.team_role.trim()
    return HttpResponse.json(attachStatus(found))
  }),

  http.post(`${API}/admin/participants/:id/reactivate`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = participants.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.participation_status === 'ASSIGNED') {
      return errorResponse(409, 'already_assigned', 'Участник уже назначен')
    }

    const body = (await request.json()) as UpdateTeamRoleRequest
    found.participation_status = 'ASSIGNED'
    found.assignment_version += 1
    found.assigned_at = nowIso()
    found.removed_at = undefined
    if (body.team_role?.trim()) found.team_role = body.team_role.trim()
    ensureStatus(found)
    return HttpResponse.json(attachStatus(found))
  }),
]
