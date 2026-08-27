import { HttpResponse, http } from 'msw'
import type {
  CreateRuleRequest,
  NotificationRuleResponse,
  UpdateRuleRequest,
} from '@/shared/api/types.gen'
import { nextId, notificationRules, nowIso, registrations } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound } from '../http'
import { registrationOf, ruleType } from './registration.helpers'

export const registrationRuleHandlers = [
  http.get(`${API}/admin/events/:id/registration/rules`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = registrationOf(String(params.id))
    if (!found) return notFound()
    return HttpResponse.json(
      notificationRules
        .filter((item) => item.registration_id === found.id)
        .sort((a, b) => a.slot_no - b.slot_no),
    )
  }),

  http.post(`${API}/admin/events/:id/registration/rules`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = registrationOf(String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as CreateRuleRequest
    const existing = notificationRules.filter((item) => item.registration_id === found.id)

    if (existing.length >= 10) {
      return errorResponse(409, 'rule_limit', 'Достигнут предел в 10 правил на регистрацию')
    }
    const offset = body.offset_minutes ?? 0
    if (offset < -525600 || offset > 525600) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'offset_minutes', message: 'Смещение вне допустимого диапазона' },
      ])
    }
    if (existing.some((item) => item.offset_minutes === offset)) {
      return errorResponse(409, 'duplicate_offset', 'Правило с таким смещением уже существует')
    }

    const usedSlots = new Set(existing.map((item) => item.slot_no))
    const slot = body.slot_no ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((n) => !usedSlots.has(n))
    if (!slot || usedSlots.has(slot)) {
      return errorResponse(409, 'slot_taken', 'Слот правила занят')
    }

    const created: NotificationRuleResponse = {
      id: nextId(),
      registration_id: found.id,
      offset_minutes: offset,
      slot_no: slot,
      enabled: body.enabled ?? true,
      type: ruleType(offset),
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(body.channel_override
        ? {
            channel_override: body.channel_override as NotificationRuleResponse['channel_override'],
          }
        : {}),
    }
    notificationRules.push(created)
    found.schedule_version += 1
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${API}/admin/registration-rules/:id`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = notificationRules.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as UpdateRuleRequest
    if (body.offset_minutes !== undefined && body.offset_minutes !== found.offset_minutes) {
      const siblings = notificationRules.filter(
        (item) => item.registration_id === found.registration_id && item.id !== found.id,
      )
      if (siblings.some((item) => item.offset_minutes === body.offset_minutes)) {
        return errorResponse(409, 'duplicate_offset', 'Правило с таким смещением уже существует')
      }
      found.offset_minutes = body.offset_minutes
      found.type = ruleType(body.offset_minutes)
      const registration = registrations.find((item) => item.id === found.registration_id)
      if (registration) registration.schedule_version += 1
    }
    if (body.enabled !== undefined) found.enabled = body.enabled
    if (body.channel_override !== undefined) {
      found.channel_override = body.channel_override as NotificationRuleResponse['channel_override']
    }
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),

  http.delete(`${API}/admin/registration-rules/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = notificationRules.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.enabled = false
    found.updated_at = nowIso()
    return new HttpResponse(null, { status: 204 })
  }),
]
