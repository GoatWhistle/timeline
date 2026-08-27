import { HttpResponse, http } from 'msw'
import type {
  CreateRegistrationRequest,
  RegistrationResponse,
  UpdateRegistrationRequest,
} from '@/shared/api/types.gen'
import {
  events,
  nextId,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
} from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound } from '../http'
import { registrationOf } from './registration.helpers'

export const registrationHandlers = [
  http.get(`${API}/admin/events/:id/registration`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = registrationOf(String(params.id))
    return found ? HttpResponse.json(found) : notFound()
  }),

  http.post(`${API}/admin/events/:id/registration`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const eventId = String(params.id)
    const event = events.find((item) => item.id === eventId)
    if (!event) return notFound()
    if (registrationOf(eventId)) {
      return errorResponse(409, 'already_exists', 'Регистрация уже создана')
    }

    const body = (await request.json()) as CreateRegistrationRequest
    if (!body.url?.startsWith('https://')) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'url', message: 'Ссылка должна начинаться с https://' },
      ])
    }
    if (!body.deadline_at) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'deadline_at', message: 'Укажите дедлайн' },
      ])
    }
    if (Date.parse(body.deadline_at) > Date.parse(event.end_at)) {
      return errorResponse(
        409,
        'deadline_after_end',
        'Дедлайн не может быть позже окончания события',
      )
    }

    const created: RegistrationResponse = {
      id: nextId(),
      event_id: eventId,
      url: body.url,
      deadline_at: body.deadline_at,
      state: 'ACTIVE',
      schedule_version: 1,
      activation_version: 1,
      notification_content_version: 1,
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(body.description ? { description: body.description } : {}),
    }
    registrations.push(created)

    for (const participant of participants) {
      if (participant.event_id !== eventId) continue
      if (participant.participation_status !== 'ASSIGNED') continue
      registrationStatuses.push({
        id: nextId(),
        event_id: eventId,
        registration_id: created.id,
        participant_id: participant.id,
        status: 'TODO',
        todo_cycle: 1,
        last_change_source: 'SYSTEM',
        updated_at: nowIso(),
        user: participant.user,
      })
    }

    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${API}/admin/events/:id/registration`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = registrationOf(String(params.id))
    if (!found) return notFound()
    const event = events.find((item) => item.id === found.event_id)

    const body = (await request.json()) as UpdateRegistrationRequest
    if (body.url !== undefined) {
      if (!body.url.startsWith('https://')) {
        return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
          { field: 'url', message: 'Ссылка должна начинаться с https://' },
        ])
      }
      if (body.url !== found.url) {
        found.notification_content_version += 1
        found.url = body.url
      }
    }
    if (body.deadline_at !== undefined && body.deadline_at !== found.deadline_at) {
      if (event && Date.parse(body.deadline_at) > Date.parse(event.end_at)) {
        return errorResponse(
          409,
          'deadline_after_end',
          'Дедлайн не может быть позже окончания события',
        )
      }
      found.deadline_at = body.deadline_at
      found.schedule_version += 1
    }
    if (body.description !== undefined) found.description = body.description
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),

  http.post(`${API}/admin/events/:id/registration/enable`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = registrationOf(String(params.id))
    if (!found) return notFound()
    if (found.state === 'ACTIVE') return errorResponse(409, 'already_active', 'Регистрация активна')
    found.state = 'ACTIVE'
    found.activation_version += 1
    found.schedule_version += 1
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),

  http.post(`${API}/admin/events/:id/registration/disable`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = registrationOf(String(params.id))
    if (!found) return notFound()
    if (found.state === 'DISABLED') {
      return errorResponse(409, 'already_disabled', 'Регистрация уже выключена')
    }
    found.state = 'DISABLED'
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),
]
