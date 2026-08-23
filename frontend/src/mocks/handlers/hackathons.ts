import { HttpResponse, http } from 'msw'
import type {
  CreateHackathonRequest,
  HackathonCard,
  HackathonResponse,
  MyHackathonItem,
  RegistrationPublic,
  RegistrationStatusShort,
  StageShort,
  UpdateHackathonRequest,
} from '@/shared/api/types.gen'
import {
  hackathonState,
  hackathons,
  nextId,
  nowIso,
  participants,
  registrationStatuses,
  registrations,
  stages,
  withState,
} from '../db'
import { requireAdmin, requireUser } from '../guards'
import { API, errorResponse, notFound, paginate } from '../http'

function stagesOf(hackathonId: string) {
  return stages
    .filter((item) => item.hackathon_id === hackathonId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function nextStageOf(hackathonId: string): StageShort | undefined {
  const current = Date.now()
  const upcoming = stagesOf(hackathonId)
    .filter((item) => Date.parse(item.end_at) >= current)
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))[0]
  if (!upcoming) return undefined
  return {
    id: upcoming.id,
    name: upcoming.name,
    type: upcoming.type,
    start_at: upcoming.start_at,
    end_at: upcoming.end_at,
  }
}

function statusShortOf(participantId: string): RegistrationStatusShort | undefined {
  const status = registrationStatuses.find((item) => item.participant_id === participantId)
  if (!status) return undefined
  return {
    id: status.id,
    status: status.status,
    todo_cycle: status.todo_cycle,
    ...(status.registered_at ? { registered_at: status.registered_at } : {}),
    ...(status.note ? { note: status.note } : {}),
  }
}

/** Назначения пользователя на опубликованные хакатоны. */
function assignmentsOf(userId: string) {
  return participants.filter(
    (item) => item.user.id === userId && item.participation_status === 'ASSIGNED',
  )
}

export const hackathonHandlers = [
  http.get(`${API}/me/hackathons`, ({ request }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const url = new URL(request.url)
    const includeArchived = url.searchParams.get('include_archived') === 'true'
    const stateFilter = url.searchParams.get('state')

    const items: MyHackathonItem[] = assignmentsOf(user.id)
      .map((participant) => {
        const hackathon = hackathons.find((item) => item.id === participant.hackathon_id)
        if (!hackathon?.published_at) return null

        const state = hackathonState(hackathon)
        const registration = registrations.find((item) => item.hackathon_id === hackathon.id)

        const item: MyHackathonItem = {
          id: hackathon.id,
          title: hackathon.title,
          start_at: hackathon.start_at,
          end_at: hackathon.end_at,
          state,
          team_role: participant.team_role,
          ...(hackathon.organizer ? { organizer: hackathon.organizer } : {}),
          ...(nextStageOf(hackathon.id) ? { next_stage: nextStageOf(hackathon.id) } : {}),
          ...(registration?.deadline_at ? { registration_deadline: registration.deadline_at } : {}),
          ...(registration?.url ? { registration_url: registration.url } : {}),
          ...(statusShortOf(participant.id)
            ? { registration_status: statusShortOf(participant.id) }
            : {}),
        }
        return item
      })
      .filter((item): item is MyHackathonItem => item !== null)
      .filter((item) => (includeArchived ? true : item.state !== 'ARCHIVED'))
      .filter((item) => (stateFilter ? item.state === stateFilter : true))
      .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))

    return HttpResponse.json(paginate(items, url))
  }),

  http.get(`${API}/hackathons/:id`, ({ params }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const id = String(params.id)
    const hackathon = hackathons.find((item) => item.id === id)
    if (!hackathon) return notFound()

    const participant = participants.find(
      (item) => item.hackathon_id === id && item.user.id === user.id,
    )
    // Чужое назначение не раскрывается: для неназначенного — 404, а не 403.
    if (!participant && !user.is_admin) return notFound()
    if (!hackathon.published_at && !user.is_admin) return notFound()

    const state = hackathonState(hackathon)
    const registration = registrations.find((item) => item.hackathon_id === id)
    const status = participant ? statusShortOf(participant.id) : undefined

    const registrationPublic: RegistrationPublic | undefined = registration
      ? {
          url: registration.url,
          state: registration.state,
          ...(registration.deadline_at ? { deadline_at: registration.deadline_at } : {}),
          ...(registration.description ? { description: registration.description } : {}),
        }
      : undefined

    // Отметиться можно только по своему TODO при активной регистрации,
    // назначенном участии и неархивном хакатоне (раздел 8 ТЗ).
    const canMarkDone =
      Boolean(participant) &&
      participant?.participation_status === 'ASSIGNED' &&
      registration?.state === 'ACTIVE' &&
      status?.status === 'TODO' &&
      state !== 'ARCHIVED'

    const card: HackathonCard = {
      hackathon: {
        ...withState(hackathon),
        ...(user.is_admin ? {} : { notes: undefined }),
      },
      stages: stagesOf(id),
      can_mark_done: canMarkDone,
      ...(participant?.team_role ? { team_role: participant.team_role } : {}),
      ...(nextStageOf(id) ? { next_stage: nextStageOf(id) } : {}),
      ...(registrationPublic ? { registration: registrationPublic } : {}),
      ...(status ? { registration_status: status } : {}),
    }
    return HttpResponse.json(card)
  }),

  http.get(`${API}/hackathons/:id/stages`, ({ params }) => {
    const { deny } = requireUser()
    if (deny) return deny
    return HttpResponse.json(stagesOf(String(params.id)))
  }),

  http.post(`${API}/hackathons/:id/registration/done`, ({ params }) => {
    const { user, deny } = requireUser()
    if (deny) return deny

    const participant = participants.find(
      (item) => item.hackathon_id === String(params.id) && item.user.id === user.id,
    )
    if (!participant) return notFound()

    const status = registrationStatuses.find((item) => item.participant_id === participant.id)
    if (!status) return notFound()
    if (status.status !== 'TODO') {
      return errorResponse(409, 'invalid_transition', 'Статус уже изменён')
    }

    status.status = 'DONE'
    status.registered_at = nowIso()
    status.last_change_source = 'USER'
    status.last_changed_by_user_id = user.id
    status.updated_at = nowIso()
    return HttpResponse.json(status)
  }),

  http.get(`${API}/admin/hackathons`, ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
    const stateFilter = url.searchParams.get('state')
    const includeArchived = url.searchParams.get('include_archived') === 'true'

    const items = hackathons
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

  http.post(`${API}/admin/hackathons`, async ({ request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const body = (await request.json()) as CreateHackathonRequest
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

    const created: HackathonResponse = {
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
    hackathons.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(`${API}/admin/hackathons/:id`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = hackathons.find((item) => item.id === String(params.id))
    return found ? HttpResponse.json(withState(found)) : notFound()
  }),

  http.patch(`${API}/admin/hackathons/:id`, async ({ params, request }) => {
    const { deny } = requireAdmin()
    if (deny) return deny

    const found = hackathons.find((item) => item.id === String(params.id))
    if (!found) return notFound()

    const body = (await request.json()) as UpdateHackathonRequest
    const nextEnd = body.end_at ?? found.end_at
    const nextStart = body.start_at ?? found.start_at
    if (Date.parse(nextEnd) <= Date.parse(nextStart)) {
      return errorResponse(400, 'validation_failed', 'Некорректные данные запроса', [
        { field: 'end_at', message: 'Окончание должно быть позже начала' },
      ])
    }

    // CHECK deadline_at <= end_at выражен в БД; здесь воспроизводится его отказ.
    const registration = registrations.find((item) => item.hackathon_id === found.id)
    if (registration?.deadline_at && Date.parse(nextEnd) < Date.parse(registration.deadline_at)) {
      return errorResponse(
        409,
        'deadline_after_end',
        'Окончание хакатона не может быть раньше дедлайна регистрации',
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

  http.post(`${API}/admin/hackathons/:id/publish`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = hackathons.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.archived_at) return errorResponse(409, 'archived', 'Хакатон в архиве')
    if (found.published_at)
      return errorResponse(409, 'already_published', 'Хакатон уже опубликован')
    found.published_at = nowIso()
    found.updated_at = nowIso()
    return HttpResponse.json(withState(found))
  }),

  http.post(`${API}/admin/hackathons/:id/archive`, ({ params }) => {
    const { deny } = requireAdmin()
    if (deny) return deny
    const found = hackathons.find((item) => item.id === String(params.id))
    if (!found) return notFound()
    if (found.archived_at) return errorResponse(409, 'already_archived', 'Хакатон уже в архиве')
    found.archived_at = nowIso()
    found.updated_at = nowIso()
    return HttpResponse.json(withState(found))
  }),
]
