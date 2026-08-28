import { HttpResponse, http } from 'msw'
import type { UpdateProfileRequest } from '@/shared/api/types.gen'
import { currentUser, nowIso } from '../fixtures'
import { requireUser } from '../guards'
import { API, errorResponse } from '../http'

export const profileHandlers = [
  http.patch(`${API}/me`, async ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const body = (await request.json()) as UpdateProfileRequest
    if (body.display_name !== undefined) {
      if (!body.display_name.trim()) {
        return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
          { field: 'display_name', message: 'Имя не может быть пустым' },
        ])
      }
      user.display_name = body.display_name.trim()
    }
    if (body.telegram_username !== undefined) user.telegram_username = body.telegram_username
    if (body.preferred_channel !== undefined) {
      if (body.preferred_channel === 'TELEGRAM' && !user.telegram_linked) {
        return errorResponse(409, 'channel_unavailable', 'Telegram не привязан к учётной записи')
      }
      user.preferred_channel = body.preferred_channel as typeof user.preferred_channel
    }
    user.updated_at = nowIso()
    return HttpResponse.json(user)
  }),

  http.post(`${API}/me/email-change`, async ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny
    const body = (await request.json()) as { new_email?: string; password?: string }
    if (!body.new_email || !body.password) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'new_email', message: 'Укажите новый адрес' },
      ])
    }
    user.pending_email = body.new_email.trim().toLowerCase()
    return HttpResponse.json(
      { message: 'Письмо с подтверждением отправлено на новый адрес' },
      { status: 202 },
    )
  }),

  http.post(`${API}/auth/email-change/confirm`, async ({ request }) => {
    const body = (await request.json()) as { token?: string }
    const user = currentUser()
    if (!body.token) return errorResponse(400, 'validation_failed', 'Токен не передан')
    if (!user?.pending_email) {
      return errorResponse(409, 'no_pending_email', 'Смена адреса не запрашивалась')
    }
    user.email = user.pending_email
    user.pending_email = undefined
    user.updated_at = nowIso()
    return HttpResponse.json({ message: 'Адрес изменён' })
  }),

  http.post(`${API}/me/telegram/link`, () => {
    const { deny } = requireUser()
    if (deny) return deny
    return HttpResponse.json({
      deep_link: 'https://t.me/timeline_bot?start=mock-link-token',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
  }),

  http.delete(`${API}/me/telegram`, () => {
    const { user, deny } = requireUser()
    if (deny) return deny
    user.telegram_linked = false
    user.telegram_username = undefined
    if (user.preferred_channel === 'TELEGRAM') user.preferred_channel = undefined
    return HttpResponse.json({ message: 'Привязка Telegram удалена' })
  }),

  http.post(`${API}/me/deactivate`, () => {
    const { user, deny } = requireUser()
    if (deny) return deny
    user.is_active = false
    return HttpResponse.json({ message: 'Учётная запись деактивирована' })
  }),
]
