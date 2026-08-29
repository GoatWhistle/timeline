import { expect } from 'vitest'
import { api, resetCsrfToken } from '@/shared/api/client'
import { ADMIN_EMAIL, ADMIN_PASSWORD, signIn, signInAsAdmin } from './session'
import { resetSession } from './setup'

export const MEMBER_PASSWORD = 'contract-member-123'

export type Seeded = {
  eventId: string
  archivedEventId: string
  participantId: string
  registrationId: string
  memberEmail: string
  memberUserId: string
  spareUserId: string
}

let seeded: Seeded | null = null

const inThe = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

function tokenFrom(acceptLink: string): string {
  const token = acceptLink.split('/').pop()
  if (!token) throw new Error(`no token in the invite link: ${acceptLink}`)
  return token
}

async function createUser(displayName: string): Promise<{ email: string; id: string }> {
  const email = `contract-${displayName.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@example.com`

  const invite = await api.POST('/admin/invites', { body: { email } })
  expect(invite.response.status).toBe(201)
  const acceptLink = invite.data?.accept_link
  if (!acceptLink) throw new Error('the invite carries no accept_link')

  resetSession()
  resetCsrfToken()
  const accepted = await api.POST('/invites/accept', {
    body: { token: tokenFrom(acceptLink), first_name: displayName, last_name: 'Contract', password: MEMBER_PASSWORD },
  })
  expect(accepted.response.status).toBe(200)
  const id = accepted.data?.user?.id
  if (!id) throw new Error('accepting the invite returned no user')

  await signIn(ADMIN_EMAIL, ADMIN_PASSWORD)
  return { email, id }
}

async function createEvent(title: string): Promise<string> {
  const created = await api.POST('/admin/events', {
    body: {
      title,
      kind: 'HACKATHON',
      format: 'ONLINE',
      start_at: inThe(1),
      end_at: inThe(2),
      organizer: 'Contract suite',
      notes: 'Administrative note',
    },
  })
  expect(created.response.status).toBe(201)
  const id = created.data?.id
  if (!id) throw new Error('creating the event returned no identifier')
  return id
}

export async function seed(): Promise<Seeded> {
  if (seeded) return seeded

  await signInAsAdmin()

  const member = await createUser('Member')
  const spare = await createUser('Spare')

  const eventId = await createEvent('Contract suite event')
  expect(
    (await api.POST('/admin/events/{id}/publish', { params: { path: { id: eventId } } })).response
      .status,
  ).toBe(200)

  const registration = await api.POST('/admin/events/{id}/registration', {
    params: { path: { id: eventId } },
    body: {
      url: 'https://example.com/register',
      deadline_at: inThe(1),
      description: 'Registration for the contract suite',
    },
  })
  expect(registration.response.status).toBe(201)
  const registrationId = registration.data?.id
  if (!registrationId) throw new Error('creating the registration returned no identifier')

  expect(
    (
      await api.POST('/admin/events/{id}/registration/rules', {
        params: { path: { id: eventId } },
        body: { offset_minutes: 1440, enabled: true },
      })
    ).response.status,
  ).toBe(201)

  expect(
    (
      await api.POST('/admin/events/{id}/stages', {
        params: { path: { id: eventId } },
        body: {
          name: 'Seeded stage',
          type: 'CHECKPOINT',
          start_at: inThe(1),
          end_at: inThe(2),
          sort_order: 1,
        },
      })
    ).response.status,
  ).toBe(201)

  const added = await api.POST('/admin/events/{id}/participants/batch-add', {
    params: { path: { id: eventId } },
    body: {
      items: [
        { user_id: member.id, team_role: 'Developer' },
        { user_id: spare.id, team_role: 'Designer' },
      ],
    },
  })
  expect(added.response.status).toBe(200)

  const participants = await api.GET('/admin/events/{id}/participants', {
    params: { path: { id: eventId }, query: {} },
  })
  expect(participants.response.status).toBe(200)
  const participantId = participants.data?.items?.find((item) => item.user?.id === member.id)?.id
  if (!participantId) throw new Error('the seeded participant is missing from the list')

  const archivedEventId = await createEvent('Contract suite archived event')
  expect(
    (await api.POST('/admin/events/{id}/archive', { params: { path: { id: archivedEventId } } }))
      .response.status,
  ).toBe(200)

  seeded = {
    eventId,
    archivedEventId,
    participantId,
    registrationId,
    memberEmail: member.email,
    memberUserId: member.id,
    spareUserId: spare.id,
  }
  return seeded
}

export async function signInAsMember(): Promise<void> {
  const { memberEmail } = await seed()
  await signIn(memberEmail, MEMBER_PASSWORD)
}
