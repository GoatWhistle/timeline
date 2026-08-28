import { CookieJar } from './cookie-jar'
import { waitForApi } from './wait-for-api'

const jar = new CookieJar()

const realFetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request && init === undefined ? input : new Request(input, init)
  const cookies = jar.header()
  if (cookies) request.headers.set('Cookie', cookies)
  return realFetch(request).then((response) => {
    jar.absorb(response.headers.getSetCookie())
    return response
  })
}) as typeof fetch

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    get cookie() {
      return jar.header()
    },
    set cookie(value: string) {
      jar.absorb([value])
    },
  },
})

export function resetSession(): void {
  jar.clear()
}

export function expireAccessToken(): void {
  jar.drop('access_token')
}

await waitForApi()
