import { HttpResponse, http } from 'msw'
import type {
  AdminChangeStatusRequest,
  BatchItemResult,
  BatchSetStatusRequest,
  CreateRegistrationRequest,
  CreateRuleRequest,
  NotificationRuleResponse,
  RegistrationResponse,
  UpdateRegistrationRequest,
  UpdateRuleRequest,
} from '@/shared/api/types.gen'
import {
  hackathons,
  nextId,
  notificationRules,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
} from '../db'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

const registrationOf = (hackathonId: string) =>
  registrations.find((item) => item.hackathon_id === hackathonId)

/** Тип уведомления выводится из знака смещения (раздел 9.1 ТЗ). */
const ruleType = (offsetMinutes: number): NotificationRuleResponse['type'] =>
  offsetMinutes >= 0 ? 'REGISTRATION_REMINDER' : 'REGISTRATION_OVERDUE'

export const registrationHandlers = [
  http.get(`${API}/admin/hackathons/:id/registration`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = registrationOf(String(params.id))
    return found ? HttpResponse.json(found) : notFound()
  }),

  http.post(`${API}/admin/hackathons/:id/registration`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const hackathonId = String(params.id)
    const hackathon = hackathons.find((item) => item.id === hackathonId)
    if (!hackathon) return notFound()
    if (registrationOf(hackathonId)) {
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
    if (Date.parse(body.deadline_at) > Date.parse(hackathon.end_at)) {
      return errorResponse(
        409,
        'deadline_after_end',
        'Дедлайн не может быть позже окончания хакатона',
      )
    }

    const created: RegistrationResponse = {
      id: nextId(),
      hackathon_id: hackathonId,
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

    // Активная регистрация создаёт недостающие статусы TODO (раздел 7 ТЗ).
    for (const participant of participants) {
      if (participant.hackathon_id !== hackathonId) continue
      if (participant.participation_status !== 'ASSIGNED') continue
      registrationStatuses.push({
        id: nextId(),
        hackathon_id: hackathonId,
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

  http.patch(`${API}/admin/hackathons/:id/registration`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = registrationOf(String(params.id))
    if (!found) return notFound()
    const hackathon = hackathons.find((item) => item.id === found.hackathon_id)

    const body = (await request.json()) as UpdateRegistrationRequest
    if (body.url !== undefined) {
      if (!body.url.startsWith('https://')) {
        return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
          { field: 'url', message: 'Ссылка должна начинаться с https://' },
        ])
      }
      if (body.url !== found.url) {
        // Изменение ссылки версионирует actionable-контент (раздел 7 ТЗ).
        found.notification_content_version += 1
        found.url = body.url
      }
    }
    if (body.deadline_at !== undefined && body.deadline_at !== found.deadline_at) {
      if (hackathon && Date.parse(body.deadline_at) > Date.parse(hackathon.end_at)) {
        return errorResponse(
          409,
          'deadline_after_end',
          'Дедлайн не может быть позже окончания хакатона',
        )
      }
      found.deadline_at = body.deadline_at
      found.schedule_version += 1
    }
    if (body.description !== undefined) found.description = body.description
    found.updated_at = nowIso()
    return HttpResponse.json(found)
  }),

  http.post(`${API}/admin/hackathons/:id/registration/enable`, ({ params }) => {
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

  http.post(`${API}/admin/hackathons/:id/registration/disable`, ({ params }) => {
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

  http.get(`${API}/admin/hackathons/:id/registration/rules`, ({ params }) => {
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

  http.post(`${API}/admin/hackathons/:id/registration/rules`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = registrationOf(String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as CreateRuleRequest
    const existing = notificationRules.filter((item) => item.registration_id === found.id)

    // Не более 10 правил на регистрацию: ограничение выражено через slot_no.
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
    // Контракт: DELETE переводит правило в enabled=false, строка сохраняется.
    found.enabled = false
    found.updated_at = nowIso()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/admin/hackathons/:id/registration-statuses`, ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const items = registrationStatuses.filter((item) => item.hackathon_id === String(params.id))
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

    // Вход в TODO увеличивает todo_cycle и очищает registered_at (раздел 8 ТЗ).
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
    `${API}/admin/hackathons/:id/registration-statuses/batch-set/preview`,
    async ({ params, request }) => {
      const { deny } = requireAdmin()
      if (deny) return deny

      const body = (await request.json()) as BatchSetStatusRequest
      const scope = registrationStatuses.filter(
        (item) =>
          item.hackathon_id === String(params.id) &&
          (body.participant_ids ?? []).includes(item.participant_id),
      )
      const affected = scope.filter((item) => item.status !== body.status).length
      return HttpResponse.json({ affected, skipped: scope.length - affected })
    },
  ),

  http.post(
    `${API}/admin/hackathons/:id/registration-statuses/batch-set`,
    async ({ params, request }) => {
      const { user, deny } = requireAdmin()
      if (deny) return deny

      const body = (await request.json()) as BatchSetStatusRequest
      const results: BatchItemResult[] = []

      ;(body.participant_ids ?? []).forEach((participantId, index) => {
        const found = registrationStatuses.find(
          (item) =>
            item.hackathon_id === String(params.id) && item.participant_id === participantId,
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
