import { HttpResponse, http } from 'msw'
import type { CreateStageRequest, StageResponse, UpdateStageRequest } from '@/shared/api/types.gen'
import { hackathons, nextId, nowIso, stages } from '../db'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound } from '../http'

export const stageHandlers = [
  http.post(`${API}/admin/hackathons/:id/stages`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const hackathonId = String(params.id)
    if (!hackathons.some((item) => item.id === hackathonId)) return notFound()

    const body = (await request.json()) as CreateStageRequest
    if (!body.name?.trim() || !body.start_at || !body.end_at || !body.type) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'name', message: 'Заполните обязательные поля' },
      ])
    }
    if (Date.parse(body.end_at) <= Date.parse(body.start_at)) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'end_at', message: 'Окончание должно быть позже начала' },
      ])
    }

    const created: StageResponse = {
      id: nextId(),
      hackathon_id: hackathonId,
      name: body.name.trim(),
      type: body.type,
      start_at: body.start_at,
      end_at: body.end_at,
      sort_order:
        body.sort_order ?? stages.filter((s) => s.hackathon_id === hackathonId).length + 1,
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(body.description ? { description: body.description } : {}),
      ...(body.url ? { url: body.url } : {}),
    }
    stages.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${API}/admin/stages/:id`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = stages.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as UpdateStageRequest
    const nextStart = body.start_at ?? found.start_at
    const nextEnd = body.end_at ?? found.end_at
    if (Date.parse(nextEnd) <= Date.parse(nextStart)) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'end_at', message: 'Окончание должно быть позже начала' },
      ])
    }

    Object.assign(found, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
      start_at: nextStart,
      end_at: nextEnd,
      updated_at: nowIso(),
    })
    return HttpResponse.json(found)
  }),

  http.delete(`${API}/admin/stages/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const index = stages.findIndex((item) => item.id === String(params.id))
    if (index === -1) return notFound()
    stages.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
