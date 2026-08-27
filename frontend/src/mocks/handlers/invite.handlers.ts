import { HttpResponse, http } from 'msw'
import type { CreateInviteRequest, InviteResponse } from '@/shared/api/types.gen'
import { findUserByEmail, invites, nextId, nowIso } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

export const inviteHandlers = [
  http.get(`${API}/admin/invites`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    return HttpResponse.json(paginate(invites, new URL(request.url)))
  }),

  http.post(`${API}/admin/invites`, async ({ request }) => {
    const { user, deny } = requireAdmin()
    if (deny) return deny

    const body = (await request.json()) as CreateInviteRequest
    const email = body.email?.trim().toLowerCase()
    if (!email) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'email', message: 'Укажите адрес' },
      ])
    }
    if (findUserByEmail(email)) {
      return errorResponse(409, 'user_exists', 'Пользователь с таким адресом уже зарегистрирован')
    }

    for (const invite of invites) {
      if (invite.email === email && !invite.accepted_at && !invite.revoked_at) {
        invite.revoked_at = nowIso()
      }
    }

    const created: InviteResponse = {
      id: nextId(),
      email,
      created_by_user_id: user.id,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      created_at: nowIso(),
    }
    invites.push(created)
    return HttpResponse.json(
      { invite: created, accept_link: `https://tracker.example.com/invite/mock-${created.id}` },
      { status: 201 },
    )
  }),

  http.post(`${API}/admin/invites/:id/revoke`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = invites.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.accepted_at) return errorResponse(409, 'already_accepted', 'Приглашение уже принято')
    found.revoked_at = nowIso()
    return HttpResponse.json({ message: 'Приглашение отозвано' })
  }),

  http.get(`${API}/invites/:token`, ({ params }) => {
    const token = String(params.token)
    const found = invites.find((item) => `mock-${item.id}` === token)
    if (!found) return HttpResponse.json({ valid: false })
    const valid =
      !found.accepted_at && !found.revoked_at && Date.parse(found.expires_at) > Date.now()
    return HttpResponse.json({ valid, email: found.email, expires_at: found.expires_at })
  }),
]
