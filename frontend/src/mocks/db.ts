import type {
  AuditResponse,
  HackathonResponse,
  HackathonState,
  InviteResponse,
  MeResponse,
  NotificationRuleResponse,
  ParticipantResponse,
  RegistrationResponse,
  RegistrationStatusResponse,
  StageResponse,
} from '@/shared/api/types.gen'

/**
 * Данные моков. Пока backend не готов, это единственная реализация контракта:
 * формы ответов повторяют схемы docs/swagger.json, а не выдумывают свои.
 * Соответствие проверяется в src/shared/api/contract.test.ts.
 */

export const MOCK_PASSWORD = 'password123'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const now = Date.now()
const at = (offsetDays: number, hours = 0): string =>
  new Date(now + offsetDays * DAY + hours * HOUR).toISOString()

function user(
  id: string,
  displayName: string,
  email: string,
  overrides: Partial<MeResponse> = {},
): MeResponse {
  return {
    id,
    display_name: displayName,
    email,
    email_verified: true,
    is_active: true,
    is_admin: false,
    telegram_linked: false,
    created_at: at(-200),
    updated_at: at(-10),
    ...overrides,
  }
}

export const users: MeResponse[] = [
  user('2f1b8e9c-0c4a-4a1e-9b6d-2b2f1e5c7a01', 'Анна Администратор', 'admin@example.com', {
    is_admin: true,
    telegram_linked: true,
    telegram_username: 'anna_admin',
    preferred_channel: 'TELEGRAM',
  }),
  user('7c3d5a21-6e8f-4d2b-8a19-5f0c3b7d9e02', 'Иван Петров', 'user@example.com', {
    preferred_channel: 'EMAIL',
  }),
  user('9a4e7b13-2c5d-4f8a-b0e1-6d3a8c2f4b03', 'Мария Соколова', 'maria@example.com', {
    telegram_linked: true,
    telegram_username: 'maria_s',
  }),
  user('c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e04', 'Пётр Кузнецов', 'petr@example.com', {
    email_verified: false,
  }),
  user('d5e6f7a8-9b0c-4d1e-8f2a-3b4c5d6e7f05', 'Ольга Новикова', 'olga@example.com', {
    is_active: false,
  }),
]

function hackathon(
  id: string,
  title: string,
  startOffset: number,
  endOffset: number,
  overrides: Partial<HackathonResponse> = {},
): HackathonResponse {
  return {
    id,
    title,
    start_at: at(startOffset),
    end_at: at(endOffset),
    state: 'UPCOMING',
    created_at: at(-60),
    updated_at: at(-5),
    published_at: at(-50),
    ...overrides,
  }
}

export const hackathons: HackathonResponse[] = [
  hackathon('11111111-1111-4111-8111-111111111111', 'Всероссийский хакатон по ИИ', 14, 21, {
    organizer: 'Цифровая экономика',
    website_url: 'https://example.com/ai-hack',
    description: 'Соревнование команд по прикладным задачам машинного обучения.',
    notes: 'Контактное лицо со стороны организаторов — Смирнов.',
  }),
  hackathon('22222222-2222-4222-8222-222222222222', 'Финтех-марафон', -2, 5, {
    organizer: 'Банк Развития',
    website_url: 'https://example.com/fintech',
    description: 'Разработка сервисов для малого бизнеса.',
  }),
  hackathon('33333333-3333-4333-8333-333333333333', 'Хакатон умного города', -60, -40, {
    organizer: 'Департамент транспорта',
    description: 'Задачи городской инфраструктуры.',
  }),
  hackathon('44444444-4444-4444-8444-444444444444', 'Внутренний хакатон платформы', 30, 33, {
    organizer: 'Внутренний',
    published_at: undefined,
    notes: 'Черновик, даты уточняются.',
  }),
  hackathon('55555555-5555-4555-8555-555555555555', 'Хакатон 2025 года', -400, -395, {
    organizer: 'Прошлый год',
    archived_at: at(-380),
  }),
]

/** Вычисляемое состояние по разделу 5.1 ТЗ: ARCHIVED приоритетнее дат. */
export function hackathonState(item: HackathonResponse): HackathonState {
  if (item.archived_at) return 'ARCHIVED'
  if (!item.published_at) return 'UNPUBLISHED'
  const current = Date.now()
  if (current < Date.parse(item.start_at)) return 'UPCOMING'
  if (current > Date.parse(item.end_at)) return 'FINISHED'
  return 'ACTIVE'
}

export function withState(item: HackathonResponse): HackathonResponse {
  return { ...item, state: hackathonState(item) }
}

function stage(
  id: string,
  hackathonId: string,
  name: string,
  type: StageResponse['type'],
  startOffset: number,
  endOffset: number,
  sortOrder: number,
): StageResponse {
  return {
    id,
    hackathon_id: hackathonId,
    name,
    type,
    start_at: at(startOffset),
    end_at: at(endOffset),
    sort_order: sortOrder,
    created_at: at(-60),
    updated_at: at(-60),
  }
}

export const stages: StageResponse[] = [
  stage(
    'a1000000-0000-4000-8000-000000000001',
    hackathons[0]!.id,
    'Регистрация',
    'REGISTRATION',
    0,
    10,
    1,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000002',
    hackathons[0]!.id,
    'Отбор заявок',
    'SELECTION',
    10,
    13,
    2,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000003',
    hackathons[0]!.id,
    'Основной этап',
    'PARTICIPATION',
    14,
    20,
    3,
  ),
  stage(
    'a1000000-0000-4000-8000-000000000004',
    hackathons[0]!.id,
    'Защита решений',
    'DEMO',
    20,
    21,
    4,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000001',
    hackathons[1]!.id,
    'Регистрация',
    'REGISTRATION',
    -20,
    -3,
    1,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000002',
    hackathons[1]!.id,
    'Разработка',
    'PARTICIPATION',
    -2,
    4,
    2,
  ),
  stage(
    'a2000000-0000-4000-8000-000000000003',
    hackathons[1]!.id,
    'Сдача решения',
    'SUBMISSION',
    4,
    5,
    3,
  ),
  stage(
    'a3000000-0000-4000-8000-000000000001',
    hackathons[2]!.id,
    'Основной этап',
    'PARTICIPATION',
    -60,
    -42,
    1,
  ),
  stage(
    'a3000000-0000-4000-8000-000000000002',
    hackathons[2]!.id,
    'Результаты',
    'RESULTS',
    -41,
    -40,
    2,
  ),
]

export const registrations: RegistrationResponse[] = [
  {
    id: 'b1000000-0000-4000-8000-000000000001',
    hackathon_id: hackathons[0]!.id,
    url: 'https://example.com/ai-hack/register',
    deadline_at: at(9),
    description: 'Регистрация на сайте организатора, нужен корпоративный email.',
    state: 'ACTIVE',
    schedule_version: 1,
    activation_version: 1,
    notification_content_version: 1,
    created_at: at(-50),
    updated_at: at(-5),
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    hackathon_id: hackathons[1]!.id,
    url: 'https://example.com/fintech/register',
    deadline_at: at(-1),
    state: 'ACTIVE',
    schedule_version: 2,
    activation_version: 1,
    notification_content_version: 1,
    created_at: at(-40),
    updated_at: at(-3),
  },
]

type ParticipantSeed = {
  id: string
  hackathonId: string
  userId: string
  teamRole: string
  status?: ParticipantResponse['participation_status']
}

const participantSeeds: ParticipantSeed[] = [
  {
    id: 'c1000000-0000-4000-8000-000000000001',
    hackathonId: hackathons[0]!.id,
    userId: users[1]!.id,
    teamRole: 'Разработчик',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000002',
    hackathonId: hackathons[0]!.id,
    userId: users[2]!.id,
    teamRole: 'Аналитик',
  },
  {
    id: 'c1000000-0000-4000-8000-000000000003',
    hackathonId: hackathons[0]!.id,
    userId: users[3]!.id,
    teamRole: 'Дизайнер',
    status: 'REMOVED',
  },
  {
    id: 'c2000000-0000-4000-8000-000000000001',
    hackathonId: hackathons[1]!.id,
    userId: users[1]!.id,
    teamRole: 'Капитан команды',
  },
  {
    id: 'c2000000-0000-4000-8000-000000000002',
    hackathonId: hackathons[1]!.id,
    userId: users[2]!.id,
    teamRole: 'Разработчик',
  },
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    hackathonId: hackathons[2]!.id,
    userId: users[1]!.id,
    teamRole: 'Разработчик',
  },
]

export const participants: ParticipantResponse[] = participantSeeds.map((seed) => {
  const owner = users.find((item) => item.id === seed.userId)
  if (!owner) throw new Error('Мок: неизвестный пользователь участника')
  const removed = seed.status === 'REMOVED'
  return {
    id: seed.id,
    hackathon_id: seed.hackathonId,
    team_role: seed.teamRole,
    participation_status: seed.status ?? 'ASSIGNED',
    assignment_version: 1,
    assigned_at: at(-30),
    ...(removed ? { removed_at: at(-7) } : {}),
    user: {
      id: owner.id,
      display_name: owner.display_name,
      email: owner.email,
      is_active: owner.is_active,
    },
  }
})

export const registrationStatuses: RegistrationStatusResponse[] = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    hackathon_id: hackathons[0]!.id,
    registration_id: registrations[0]!.id,
    participant_id: participants[0]!.id,
    status: 'TODO',
    todo_cycle: 1,
    last_change_source: 'SYSTEM',
    updated_at: at(-30),
    user: participants[0]!.user,
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    hackathon_id: hackathons[0]!.id,
    registration_id: registrations[0]!.id,
    participant_id: participants[1]!.id,
    status: 'DONE',
    todo_cycle: 1,
    registered_at: at(-4),
    last_change_source: 'USER',
    last_changed_by_user_id: users[2]!.id,
    updated_at: at(-4),
    user: participants[1]!.user,
  },
  {
    id: 'd2000000-0000-4000-8000-000000000001',
    hackathon_id: hackathons[1]!.id,
    registration_id: registrations[1]!.id,
    participant_id: participants[3]!.id,
    status: 'TODO',
    todo_cycle: 2,
    last_change_source: 'ADMIN',
    last_changed_by_user_id: users[0]!.id,
    note: 'Возвращено администратором: регистрация не подтвердилась.',
    updated_at: at(-2),
    user: participants[3]!.user,
  },
  {
    id: 'd2000000-0000-4000-8000-000000000002',
    hackathon_id: hackathons[1]!.id,
    registration_id: registrations[1]!.id,
    participant_id: participants[4]!.id,
    status: 'NOT_REQUIRED',
    todo_cycle: 1,
    last_change_source: 'ADMIN',
    last_changed_by_user_id: users[0]!.id,
    updated_at: at(-6),
    user: participants[4]!.user,
  },
]

export const notificationRules: NotificationRuleResponse[] = [
  {
    id: 'e1000000-0000-4000-8000-000000000001',
    registration_id: registrations[0]!.id,
    offset_minutes: 4320,
    slot_no: 1,
    enabled: true,
    type: 'REGISTRATION_REMINDER',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e1000000-0000-4000-8000-000000000002',
    registration_id: registrations[0]!.id,
    offset_minutes: 1440,
    slot_no: 2,
    enabled: true,
    type: 'REGISTRATION_REMINDER',
    channel_override: 'TELEGRAM',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e1000000-0000-4000-8000-000000000003',
    registration_id: registrations[0]!.id,
    offset_minutes: -120,
    slot_no: 3,
    enabled: true,
    type: 'REGISTRATION_OVERDUE',
    created_at: at(-50),
    updated_at: at(-50),
  },
  {
    id: 'e2000000-0000-4000-8000-000000000001',
    registration_id: registrations[1]!.id,
    offset_minutes: 60,
    slot_no: 1,
    enabled: false,
    type: 'REGISTRATION_REMINDER',
    created_at: at(-40),
    updated_at: at(-8),
  },
]

export const invites: InviteResponse[] = [
  {
    id: 'f1000000-0000-4000-8000-000000000001',
    email: 'newcomer@example.com',
    created_by_user_id: users[0]!.id,
    expires_at: at(2),
    created_at: at(-1),
  },
  {
    id: 'f1000000-0000-4000-8000-000000000002',
    email: 'accepted@example.com',
    created_by_user_id: users[0]!.id,
    expires_at: at(-5),
    accepted_at: at(-6),
    created_at: at(-8),
  },
]

export const auditLog: AuditResponse[] = [
  {
    id: 'aa000000-0000-4000-8000-000000000001',
    actor_user_id: users[0]!.id,
    actor_email: users[0]!.email,
    action: 'HACKATHON_PUBLISH',
    entity_type: 'HACKATHON',
    entity_id: hackathons[0]!.id,
    before: { published_at: null },
    after: { published_at: at(-50) },
    request_id: 'req-0001',
    created_at: at(-50),
  },
  {
    id: 'aa000000-0000-4000-8000-000000000002',
    actor_user_id: users[0]!.id,
    actor_email: users[0]!.email,
    action: 'PARTICIPANT_ADD',
    entity_type: 'HACKATHON_PARTICIPANT',
    entity_id: participants[0]!.id,
    after: { team_role: 'Разработчик', participation_status: 'ASSIGNED' },
    request_id: 'req-0002',
    created_at: at(-30),
  },
  {
    id: 'aa000000-0000-4000-8000-000000000003',
    action: 'STATUS_CHANGE',
    entity_type: 'REGISTRATION_STATUS',
    entity_id: registrationStatuses[1]!.id,
    before: { status: 'TODO' },
    after: { status: 'DONE' },
    request_id: 'req-0003',
    created_at: at(-4),
  },
]

type MockState = {
  currentUserId: string | null
  csrfToken: string
}

export const state: MockState = {
  currentUserId: null,
  csrfToken: 'mock-csrf-token',
}

export function findUserByEmail(email: string): MeResponse | undefined {
  const normalized = email.trim().toLowerCase()
  return users.find((item) => item.email.toLowerCase() === normalized)
}

export function currentUser(): MeResponse | undefined {
  return users.find((item) => item.id === state.currentUserId)
}

export function resetMockState(): void {
  state.currentUserId = null
}

export function nextId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
