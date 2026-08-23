import { HttpResponse, http } from 'msw'
import type {
  AddParticipantsRequest,
  BatchItemResult,
  CopyParticipantsRequest,
  ParticipantResponse,
  RemoveParticipantsRequest,
  UpdateTeamRoleRequest,
} from '@/shared/api/types.gen'
import {
  hackathons,
  nextId,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
  users,
} from '../db'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

function attachStatus(participant: ParticipantResponse): ParticipantResponse {
  const status = registrationStatuses.find((item) => item.participant_id === participant.id)
  if (!status) return participant
  return {
    ...participant,
    registration_status: {
      id: status.id,
      status: status.status,
      todo_cycle: status.todo_cycle,
      ...(status.registered_at ? { registered_at: status.registered_at } : {}),
      ...(status.note ? { note: status.note } : {}),
    },
  }
}

/** Назначение участника создаёт недостающий статус TODO при активной регистрации. */
function ensureStatus(participant: ParticipantResponse): void {
  const registration = registrations.find(
    (item) => item.hackathon_id === participant.hackathon_id && item.state === 'ACTIVE',
  )
  if (!registration) return
  if (registrationStatuses.some((item) => item.participant_id === participant.id)) return

  registrationStatuses.push({
    id: nextId(),
    hackathon_id: participant.hackathon_id,
    registration_id: registration.id,
    participant_id: participant.id,
    status: 'TODO',
    todo_cycle: 1,
    last_change_source: 'SYSTEM',
    updated_at: nowIso(),
    user: participant.user,
  })
}

export const participantHandlers = [
  http.get(`${API}/admin/hackathons/:id/participants`, ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const includeRemoved = url.searchParams.get('include_removed') === 'true'
    const teamRole = (url.searchParams.get('team_role') ?? '').toLowerCase()
    const statusFilter = url.searchParams.get('registration_status')
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()

    const items = participants
      .filter((item) => item.hackathon_id === String(params.id))
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

  http.post(`${API}/admin/hackathons/:id/participants/batch-add`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const hackathonId = String(params.id)
    if (!hackathons.some((item) => item.id === hackathonId)) return notFound()

    const body = (await request.json()) as AddParticipantsRequest
    const results: BatchItemResult[] = []

    body.items?.forEach((item, index) => {
      const owner = users.find((candidate) => candidate.id === item.user_id)
      if (!owner) {
        results.push({
          index,
          status: 'error',
          code: 'user_not_found',
          message: 'Пользователь не найден',
        })
        return
      }
      if (!owner.is_active) {
        results.push({
          index,
          status: 'error',
          code: 'user_inactive',
          message: `${owner.display_name}: учётная запись деактивирована`,
        })
        return
      }

      const existing = participants.find(
        (candidate) => candidate.hackathon_id === hackathonId && candidate.user.id === owner.id,
      )

      if (existing?.participation_status === 'ASSIGNED') {
        results.push({
          index,
          status: 'skipped',
          code: 'already_assigned',
          message: `${owner.display_name}: участник уже назначен`,
          id: existing.id,
        })
        return
      }

      if (existing) {
        // Повторное добавление реактивирует запись (раздел 6 ТЗ).
        existing.participation_status = 'ASSIGNED'
        existing.assignment_version += 1
        existing.assigned_at = nowIso()
        existing.removed_at = undefined
        existing.team_role = item.team_role ?? existing.team_role
        ensureStatus(existing)
        results.push({ index, status: 'ok', id: existing.id })
        return
      }

      const created: ParticipantResponse = {
        id: nextId(),
        hackathon_id: hackathonId,
        team_role: item.team_role ?? 'Участник',
        participation_status: 'ASSIGNED',
        assignment_version: 1,
        assigned_at: nowIso(),
        user: {
          id: owner.id,
          display_name: owner.display_name,
          email: owner.email,
          is_active: owner.is_active,
        },
      }
      participants.push(created)
      ensureStatus(created)
      results.push({ index, status: 'ok', id: created.id })
    })

    return HttpResponse.json({
      succeeded: results.filter((item) => item.status === 'ok').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'error').length,
      results,
    })
  }),

  http.post(`${API}/admin/hackathons/:id/participants/batch-remove`, async ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const body = (await request.json()) as RemoveParticipantsRequest
    const results: BatchItemResult[] = []

    body.participant_ids?.forEach((id, index) => {
      const found = participants.find((item) => item.id === id)
      if (!found) {
        results.push({ index, status: 'error', code: 'not_found', message: 'Участник не найден' })
        return
      }
      if (found.participation_status === 'REMOVED') {
        results.push({ index, status: 'skipped', code: 'already_removed', message: 'Уже удалён' })
        return
      }
      found.participation_status = 'REMOVED'
      found.removed_at = nowIso()
      results.push({ index, status: 'ok', id: found.id })
    })

    return HttpResponse.json({
      succeeded: results.filter((item) => item.status === 'ok').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'error').length,
      results,
    })
  }),

  http.post(`${API}/admin/hackathons/:id/participants/copy-from`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const targetId = String(params.id)
    const body = (await request.json()) as CopyParticipantsRequest
    const source = participants.filter(
      (item) =>
        item.hackathon_id === body.source_hackathon_id && item.participation_status === 'ASSIGNED',
    )
    if (source.length === 0) return notFound()

    const overrides = new Map(
      (body.overrides ?? []).map((item) => [item.user_id, item.team_role] as const),
    )
    const results: BatchItemResult[] = []

    source.forEach((item, index) => {
      const existing = participants.find(
        (candidate) => candidate.hackathon_id === targetId && candidate.user.id === item.user.id,
      )
      if (existing?.participation_status === 'ASSIGNED') {
        results.push({
          index,
          status: 'skipped',
          code: 'already_assigned',
          message: `${item.user.display_name}: участник уже назначен`,
        })
        return
      }

      const created: ParticipantResponse = {
        id: nextId(),
        hackathon_id: targetId,
        team_role: overrides.get(item.user.id) ?? item.team_role,
        participation_status: 'ASSIGNED',
        assignment_version: 1,
        assigned_at: nowIso(),
        user: item.user,
      }
      participants.push(created)
      ensureStatus(created)
      results.push({ index, status: 'ok', id: created.id })
    })

    return HttpResponse.json({
      succeeded: results.filter((item) => item.status === 'ok').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: 0,
      results,
    })
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
