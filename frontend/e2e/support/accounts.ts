const apiPort = process.env.CONTRACT_API_PORT ?? '55480'
const API = process.env.E2E_API_ORIGIN ?? `http://127.0.0.1:${apiPort}`
const BASE = `${API}/api/v1`

export const ADMIN_EMAIL = process.env.CONTRACT_ADMIN_EMAIL ?? 'contract-admin@example.com'
export const ADMIN_PASSWORD = process.env.CONTRACT_ADMIN_PASSWORD ?? 'contract-password-123'
export const MEMBER_PASSWORD = 'contract-e2e-123'

export type Jar = Map<string, string>

function absorb(jar: Jar, response: Response): void {
  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(';')
    const at = pair?.indexOf('=') ?? -1
    if (!pair || at <= 0) continue
    jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim())
  }
}

const cookieHeader = (jar: Jar) => [...jar].map(([name, value]) => `${name}=${value}`).join('; ')

export async function call(
  jar: Jar,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const cookies = cookieHeader(jar)
  if (cookies) headers.Cookie = cookies
  const csrf = jar.get('csrf_token')
  if (csrf && method !== 'GET') headers['X-CSRF-Token'] = csrf
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  absorb(jar, response)
  const text = await response.text()
  return { status: response.status, json: text ? JSON.parse(text) : null }
}

export async function adminJar(): Promise<Jar> {
  const jar: Jar = new Map()
  await call(jar, 'GET', '/auth/csrf')
  const signedIn = await call(jar, 'POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  if (signedIn.status !== 200) {
    throw new Error(`the administrator could not sign in: ${signedIn.status}`)
  }
  return jar
}

export async function createMember(): Promise<{ email: string; password: string; id: string }> {
  const jar = await adminJar()

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const invited = await call(jar, 'POST', '/admin/invites', { email })
  if (invited.status !== 201) throw new Error(`the invite was not created: ${invited.status}`)

  const link = (invited.json as { accept_link?: string }).accept_link
  const token = link?.split('/').pop()
  if (!token) throw new Error('the invite carries no token')

  const guest: Jar = new Map()
  await call(guest, 'GET', '/auth/csrf')
  const accepted = await call(guest, 'POST', '/invites/accept', {
    token,
    display_name: 'End To End',
    password: MEMBER_PASSWORD,
  })
  if (accepted.status !== 200) throw new Error(`the invite was not accepted: ${accepted.status}`)

  const id = (accepted.json as { user?: { id?: string } }).user?.id
  if (!id) throw new Error('accepting the invite returned no user')

  return { email, password: MEMBER_PASSWORD, id }
}
