import { HttpResponse, http } from 'msw'
import type { UserSummary } from '@/shared/api/types.gen'
import { users } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, notFound, paginate } from '../http'

export const userHandlers = [
  http.get(`${API}/admin/users`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const query = (url.searchParams.get('query') ?? '').trim().toLowerCase()
    const items: UserSummary[] = users
      .filter((item) =>
        query
          ? item.display_name.toLowerCase().includes(query) ||
            item.email.toLowerCase().includes(query)
          : true,
      )
      .map((item) => ({
        id: item.id,
        display_name: item.display_name,
        email: item.email,
        is_active: item.is_active,
      }))

    return HttpResponse.json(paginate(items, url))
  }),

  http.post(`${API}/admin/users/:id/activate`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.is_active = true
    return HttpResponse.json({ message: 'Учётная запись активирована' })
  }),

  http.post(`${API}/admin/users/:id/deactivate`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.is_active = false
    found.telegram_linked = false
    found.telegram_username = undefined
    return HttpResponse.json({ message: 'Учётная запись деактивирована' })
  }),

  http.delete(`${API}/admin/users/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = users.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    found.display_name = 'Удалённый пользователь'
    found.email = `deleted-${found.id}@example.invalid`
    found.is_active = false
    found.telegram_linked = false
    found.telegram_username = undefined
    return HttpResponse.json({ message: 'Учётная запись удалена' })
  }),
]
