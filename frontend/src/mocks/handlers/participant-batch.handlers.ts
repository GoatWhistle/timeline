import { HttpResponse, http } from 'msw'
import type {
  AddParticipantsRequest,
  BatchItemResult,
  CopyParticipantsRequest,
  ParticipantResponse,
  RemoveParticipantsRequest,
} from '@/shared/api/types.gen'
import { events, nextId, nowIso, participants, users } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, notFound } from '../http'
import { ensureStatus } from './participant.helpers'

export const participantBatchHandlers = [
  http.post(`${API}/admin/events/:id/participants/batch-add`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const eventId = String(params.id)
    if (!events.some((item) => item.id === eventId)) return notFound()

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
        (candidate) => candidate.event_id === eventId && candidate.user.id === owner.id,
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
        event_id: eventId,
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

  http.post(`${API}/admin/events/:id/participants/batch-remove`, async ({ request }) => {
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

  http.post(`${API}/admin/events/:id/participants/copy-from`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const targetId = String(params.id)
    const body = (await request.json()) as CopyParticipantsRequest
    const source = participants.filter(
      (item) => item.event_id === body.source_event_id && item.participation_status === 'ASSIGNED',
    )
    if (source.length === 0) return notFound()

    const overrides = new Map(
      (body.overrides ?? []).map((item) => [item.user_id, item.team_role] as const),
    )
    const results: BatchItemResult[] = []

    source.forEach((item, index) => {
      const existing = participants.find(
        (candidate) => candidate.event_id === targetId && candidate.user.id === item.user.id,
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
        event_id: targetId,
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
]
