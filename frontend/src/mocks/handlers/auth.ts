import { HttpResponse, http } from 'msw'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/shared/api/types.gen'
import { currentUser, findUserByEmail, MOCK_PASSWORD, resetMockState, state, users } from '../db'
import { API, errorResponse, unauthenticated } from '../http'

const HOUR = 60 * 60 * 1000

function authResponse(): AuthResponse {
  const user = currentUser()
  if (!user) throw new Error('Мок: нет текущего пользователя')
  return {
    user,
    access_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + 30 * 24 * HOUR).toISOString(),
  }
}

export const authHandlers = [
  http.get(`${API}/auth/csrf`, () =>
    HttpResponse.json({ csrf_token: state.csrfToken, header_name: 'X-CSRF-Token' }),
  ),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest
    const user = body.email ? findUserByEmail(body.email) : undefined

    if (!user || body.password !== MOCK_PASSWORD) {
      return errorResponse(401, 'invalid_credentials', 'Неверный email или пароль')
    }
    if (!user.is_active) {
      return errorResponse(403, 'user_inactive', 'Учётная запись деактивирована')
    }

    state.currentUserId = user.id
    return HttpResponse.json(authResponse())
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterRequest
    if (!body.email || !body.password || !body.display_name) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса')
    }
    if (findUserByEmail(body.email)) {
      return errorResponse(409, 'email_taken', 'Пользователь с таким email уже существует')
    }

    const user = {
      id: crypto.randomUUID(),
      display_name: body.display_name,
      email: body.email.trim().toLowerCase(),
      email_verified: false,
      is_active: true,
      is_admin: false,
      telegram_linked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    users.push(user)
    state.currentUserId = user.id
    // Контракт объявляет для регистрации код 200, а не 201.
    return HttpResponse.json(authResponse())
  }),

  http.post(`${API}/auth/refresh`, () => {
    if (!state.currentUserId) return unauthenticated()
    return HttpResponse.json(authResponse())
  }),

  http.post(`${API}/auth/logout`, () => {
    resetMockState()
    return HttpResponse.json({ message: 'Сессия завершена' })
  }),

  http.post(`${API}/auth/logout-all`, () => {
    resetMockState()
    return HttpResponse.json({ message: 'Все сессии завершены' })
  }),

  http.get(`${API}/me`, () => {
    const user = currentUser()
    return user ? HttpResponse.json(user) : unauthenticated()
  }),
]
