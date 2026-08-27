import { HttpResponse, http } from 'msw'
import type { CreateEventRequest, EventResponse, UpdateEventRequest } from '@/shared/api/types.gen'
import { events, nextId, nowIso, registrations, withState } from '../fixtures'
import { requireAdmin } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

export const adminEventHandlers = [
  http.get(`${API}/admin/events`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
    const stateFilter = url.searchParams.get('state')
    const includeArchived = url.searchParams.get('include_archived') === 'true'

    const items = events
      .map(withState)
      .filter((item) => (includeArchived ? true : item.state !== 'ARCHIVED'))
      .filter((item) => (stateFilter ? item.state === stateFilter : true))
      .filter((item) =>
        search
          ? item.title.toLowerCase().includes(search) ||
            (item.organizer ?? '').toLowerCase().includes(search)
          : true,
      )
      .sort((a, b) => Date.parse(b.start_at) - Date.parse(a.start_at))

    return HttpResponse.json(paginate(items, url))
  }),

  http.post(`${API}/admin/events`, async ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const body = (await request.json()) as CreateEventRequest
    if (!body.title?.trim()) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'title', message: 'Укажите название' },
      ])
    }
    if (!body.start_at || !body.end_at || Date.parse(body.end_at) <= Date.parse(body.start_at)) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'end_at', message: 'Окончание должно быть позже начала' },
      ])
    }

    const created: EventResponse = {
      id: nextId(),
      title: body.title.trim(),
      start_at: body.start_at,
      end_at: body.end_at,
      state: 'UNPUBLISHED',
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(body.description ? { description: body.description } : {}),
      ...(body.organizer ? { organizer: body.organizer } : {}),
      ...(body.website_url ? { website_url: body.website_url } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    }
    events.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(`${API}/admin/events/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = events.find((item) => item.id === String(params.id))
    return found ? HttpResponse.json(withState(found)) : notFound()
  }),

  http.patch(`${API}/admin/events/:id`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = events.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as UpdateEventRequest
    const nextEnd = body.end_at ?? found.end_at
    const nextStart = body.start_at ?? found.start_at
    if (Date.parse(nextEnd) <= Date.parse(nextStart)) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'end_at', message: 'Окончание должно быть позже начала' },
      ])
    }

    const registration = registrations.find((item) => item.event_id === found.id)
    if (registration?.deadline_at && Date.parse(nextEnd) < Date.parse(registration.deadline_at)) {
      return errorResponse(
        409,
        'deadline_after_end',
        'Окончание события не может быть раньше дедлайна регистрации',
      )
    }

    Object.assign(found, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.organizer !== undefined ? { organizer: body.organizer } : {}),
      ...(body.website_url !== undefined ? { website_url: body.website_url } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      start_at: nextStart,
      end_at: nextEnd,
      updated_at: nowIso(),
    })
    if (body.end_at && registration) registration.schedule_version += 1
    return HttpResponse.json(withState(found))
  }),

  http.post(`${API}/admin/events/:id/publish`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = events.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.archived_at) return errorResponse(409, 'archived', 'Событие в архиве')
    if (found.published_at)
      return errorResponse(409, 'already_published', 'Событие уже опубликован')
    found.published_at = nowIso()
    found.updated_at = nowIso()
    return HttpResponse.json(withState(found))
  }),

  http.post(`${API}/admin/events/:id/archive`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = events.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.archived_at) return errorResponse(409, 'already_archived', 'Событие уже в архиве')
    found.archived_at = nowIso()
    found.updated_at = nowIso()
    return HttpResponse.json(withState(found))
  }),
]
