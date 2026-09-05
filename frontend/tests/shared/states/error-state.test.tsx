import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { ensureLocale, i18n } from '@/shared/i18n/config'
import { LOCALES, type Locale } from '@/shared/i18n/locale'
import { ErrorState } from '@/shared/ui/data-display/error-state'

afterEach(() => {
  vi.restoreAllMocks()
})

function online(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

describe('a failed screen never shows the user a machine string', () => {
  it.each(LOCALES)('shows translated wording, not "Failed to fetch", in %s', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)
    online(true)

    renderWithProviders(<ErrorState error={new TypeError('Failed to fetch')} />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).not.toContain('Failed to fetch')
    expect(alert.textContent).not.toContain('fetch')
    expect(alert).toHaveTextContent(String(i18n.getResource(lc, 'errors', 'transport_network')))
  })

  it.each(LOCALES)('prefers the dictionary over the English the server sent, in %s', async (lc) => {
    await ensureLocale(lc as Locale)
    await i18n.changeLanguage(lc)

    const error = new ApiError(409, { code: 'already_member', message: 'RAW ENGLISH FALLBACK' })
    renderWithProviders(<ErrorState error={error} />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).not.toContain('RAW ENGLISH FALLBACK')
    expect(alert).toHaveTextContent(String(i18n.getResource(lc, 'errors', 'already_member')))
  })

  it('says the connection is gone rather than blaming the server when offline', async () => {
    await ensureLocale('ru')
    await i18n.changeLanguage('ru')
    online(false)

    renderWithProviders(<ErrorState error={new TypeError('Failed to fetch')} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      String(i18n.getResource('ru', 'errors', 'transport_offline')),
    )
  })

  it('names an aborted request a timeout, which is a different remedy', async () => {
    await ensureLocale('ru')
    await i18n.changeLanguage('ru')

    renderWithProviders(<ErrorState error={new DOMException('gone', 'AbortError')} />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      String(i18n.getResource('ru', 'errors', 'transport_timeout')),
    )
  })

  it('shows the request id when the server gave one, so support can trace it', () => {
    const error = new ApiError(500, { code: 'internal_error', request_id: '01HZY0Q2K7' })
    renderWithProviders(<ErrorState error={error} />)

    expect(screen.getByRole('alert')).toHaveTextContent('01HZY0Q2K7')
  })
})

describe('a failed screen offers a way forward only where one exists', () => {
  it('offers retry for a transport failure, which is what retrying is for', () => {
    online(true)
    renderWithProviders(<ErrorState error={new TypeError('Failed to fetch')} onRetry={vi.fn()} />)

    expect(screen.getByRole('button', { name: i18n.t('action.retry') })).toBeInTheDocument()
  })

  it('runs the retry handler when the button is pressed', async () => {
    online(true)
    const onRetry = vi.fn()
    const { user } = renderWithProviders(
      <ErrorState error={new TypeError('Failed to fetch')} onRetry={onRetry} />,
    )

    await user.click(screen.getByRole('button', { name: i18n.t('action.retry') }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [400, 'validation_failed'],
  ])('withholds retry on %i, where the same request fails the same way', (status, code) => {
    renderWithProviders(<ErrorState error={new ApiError(status, { code })} onRetry={vi.fn()} />)

    expect(screen.queryByRole('button', { name: i18n.t('action.retry') })).not.toBeInTheDocument()
  })

  it('keeps retry after a rate limit, because waiting is the remedy', () => {
    renderWithProviders(
      <ErrorState error={new ApiError(429, { code: 'rate_limited' })} onRetry={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: i18n.t('action.retry') })).toBeInTheDocument()
  })

  it('shows the offered alternative when retrying would not help', () => {
    renderWithProviders(
      <ErrorState
        error={new ApiError(404, { code: 'not_found' })}
        onRetry={vi.fn()}
        action={<button type="button">Go home</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument()
  })
})

describe('a failed screen looks like the rest of the product', () => {
  it('draws a figure labelled with the message, as the empty states do', () => {
    online(true)
    renderWithProviders(<ErrorState error={new TypeError('Failed to fetch')} />)

    const figure = screen.getByRole('img')
    expect(figure).toBeInTheDocument()
    expect(figure.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(0)
  })

  it('claims the height of its pane instead of clinging to the top', () => {
    renderWithProviders(<ErrorState error={new ApiError(500, { code: 'internal_error' })} />)

    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('min-h-')
    expect(alert.className).toContain('flex-1')
    expect(alert.className).toContain('justify-center')
  })

  it('gives each kind of failure its own drawing, so they do not look alike', () => {
    const drawings = new Set<string>()

    online(true)
    const network = renderWithProviders(<ErrorState error={new TypeError('x')} />)
    drawings.add(network.container.querySelector('svg')?.innerHTML ?? 'a')
    network.unmount()

    online(false)
    const offline = renderWithProviders(<ErrorState error={new TypeError('x')} />)
    drawings.add(offline.container.querySelector('svg')?.innerHTML ?? 'b')
    offline.unmount()

    const server = renderWithProviders(
      <ErrorState error={new ApiError(500, { code: 'internal_error' })} />,
    )
    drawings.add(server.container.querySelector('svg')?.innerHTML ?? 'c')
    server.unmount()

    const denied = renderWithProviders(
      <ErrorState error={new ApiError(403, { code: 'forbidden' })} />,
    )
    drawings.add(denied.container.querySelector('svg')?.innerHTML ?? 'd')
    denied.unmount()

    expect(drawings.size).toBe(4)
  })

  it('gates the figure animation behind motion-safe, as every other figure does', () => {
    online(true)
    const { container } = renderWithProviders(<ErrorState error={new TypeError('x')} />)

    const animated = [...container.querySelectorAll('[class*="animate-"]')]
    expect(animated.length).toBeGreaterThan(0)
    for (const node of animated) {
      expect(node.getAttribute('class')).toContain('motion-safe:')
    }
  })
})
