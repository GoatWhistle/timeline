import { HttpResponse, http } from 'msw'
import type {
  AdminChangeStatusRequest,
  BatchItemResult,
  BatchSetStatusRequest,
} from '@/shared/api/types.gen'
import { nowIso, registrationStatuses } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

export const registrationStatusHandlers = [
  http.get(`${API}/admin/events/:id/registration-statuses`, ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const items = registrationStatuses.filter((item) => item.event_id === String(params.id))
    return HttpResponse.json(paginate(items, new URL(request.url)))
  }),

  http.patch(`${API}/admin/registration-statuses/:id`, async ({ params, request }) => {
    const { user, deny } = requireAdmin()
    if (deny) return deny

    const found = registrationStatuses.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as AdminChangeStatusRequest
    if (!body.status) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'status', message: 'Укажите статус' },
      ])
    }
    if (body.status === found.status) {
      return errorResponse(409, 'invalid_transition', 'Статус уже установлен')
    }

    if (body.status === 'TODO') {
      found.todo_cycle += 1
      found.registered_at = undefined
    }
    if (body.status === 'DONE') found.registered_at = nowIso()
    if (body.status === 'NOT_REQUIRED') found.registered_at = undefined

    found.status = body.status
    found.last_change_source = 'ADMIN'
    found.last_changed_by_user_id = user.id
    if (body.note !== undefined) found.note = body.note
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),

  http.post(
    `${API}/admin/events/:id/registration-statuses/batch-set/preview`,
    async ({ params, request }) => {
      const { deny } = requireAdmin()
      if (deny) return deny

      const body = (await request.json()) as BatchSetStatusRequest
      const scope = registrationStatuses.filter(
        (item) =>
          item.event_id === String(params.id) &&
          (body.participant_ids ?? []).includes(item.participant_id),
      )
      const affected = scope.filter((item) => item.status !== body.status).length
      return HttpResponse.json({ affected, skipped: scope.length - affected })
    },
  ),

  http.post(
    `${API}/admin/events/:id/registration-statuses/batch-set`,
    async ({ params, request }) => {
      const { user, deny } = requireAdmin()
      if (deny) return deny

      const body = (await request.json()) as BatchSetStatusRequest
      const results: BatchItemResult[] = []

      ;(body.participant_ids ?? []).forEach((participantId, index) => {
        const found = registrationStatuses.find(
          (item) => item.event_id === String(params.id) && item.participant_id === participantId,
        )
        if (!found) {
          results.push({ index, status: 'error', code: 'not_found', message: 'Статус не найден' })
          return
        }
        if (found.status === body.status) {
          results.push({
            index,
            status: 'skipped',
            code: 'no_change',
            message: 'Статус уже установлен',
          })
          return
        }
        if (body.status === 'TODO') {
          found.todo_cycle += 1
          found.registered_at = undefined
        }
        if (body.status === 'DONE') found.registered_at = nowIso()
        found.status = body.status ?? found.status
        found.last_change_source = 'ADMIN'
        found.last_changed_by_user_id = user.id
        if (body.note !== undefined) found.note = body.note
        found.updated_at = nowIso()
        results.push({ index, status: 'ok', id: found.id })
      })

      return HttpResponse.json({
        succeeded: results.filter((item) => item.status === 'ok').length,
        skipped: results.filter((item) => item.status === 'skipped').length,
        failed: results.filter((item) => item.status === 'error').length,
        results,
      })
    },
  ),
]
