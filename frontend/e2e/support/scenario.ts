import { adminJar, call, createMember, type Jar } from './accounts'

export type AssignedMember = {
  email: string
  password: string
  eventId: string
  eventTitle: string
}

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

function idOf(payload: unknown, what: string): string {
  const id = (payload as { id?: string }).id
  if (!id) throw new Error(`${what} returned no identifier`)
  return id
}

async function expectStatus(
  jar: Jar,
  method: string,
  path: string,
  body: unknown,
  wanted: number,
  what: string,
): Promise<unknown> {
  const { status, json } = await call(jar, method, path, body)
  if (status !== wanted) {
    throw new Error(`${what}: expected ${wanted}, got ${status} — ${JSON.stringify(json)}`)
  }
  return json
}

export async function memberWithOpenRegistration(): Promise<AssignedMember> {
  const member = await createMember()
  const jar = await adminJar()

  const title = `E2E event ${Date.now()}`
  const event = await expectStatus(
    jar,
    'POST',
    '/admin/events',
    {
      title,
      kind: 'HACKATHON',
      format: 'ONLINE',
      start_at: inThe(1),
      end_at: inThe(3),
      organizer: 'End to end suite',
    },
    201,
    'creating the event',
  )
  const eventId = idOf(event, 'creating the event')

  await expectStatus(jar, 'POST', `/admin/events/${eventId}/publish`, undefined, 200, 'publishing')

  await expectStatus(
    jar,
    'POST',
    `/admin/events/${eventId}/participants/batch-add`,
    { items: [{ user_id: member.id, team_role: 'Developer' }] },
    200,
    'assigning the participant',
  )

  await expectStatus(
    jar,
    'POST',
    `/admin/events/${eventId}/registration`,
    {
      url: 'https://example.com/register',
      deadline_at: inThe(2),
      description: 'Sign up on the external site',
    },
    201,
    'opening the registration',
  )

  return { email: member.email, password: member.password, eventId, eventTitle: title }
}

export async function statusOf(eventId: string, userId?: string): Promise<string> {
  const jar = await adminJar()
  const { json } = await call(
    jar,
    'GET',
    `/admin/events/${eventId}/registration-statuses`,
    undefined,
  )
  const items = (
    json as { items?: { status?: string; participant?: { user?: { id?: string } } }[] }
  ).items
  if (!items || items.length === 0) throw new Error('the event carries no registration statuses')
  const row = userId ? items.find((i) => i.participant?.user?.id === userId) : items[0]
  return row?.status ?? 'UNKNOWN'
}
