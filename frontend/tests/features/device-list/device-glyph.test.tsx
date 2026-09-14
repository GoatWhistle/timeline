import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { describeDevice } from '@/entities/session/device-label'
import { deviceSessionsQueryKey } from '@/entities/session/device-sessions.queries'
import { DeviceList } from '@/features/device-list/device-list'
import type { SessionResponse } from '@/shared/api/types.gen'
import { i18n } from '@/shared/i18n/config'
import { BROWSER_GLYPHS } from '@/shared/ui/brand/device-glyph/browser-glyphs'
import { PLATFORM_GLYPHS } from '@/shared/ui/brand/device-glyph/platform-glyphs'

const AGENTS = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  yandexWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 YaBrowser/24.4.0 Safari/537.36',
}

function session(patch: Partial<SessionResponse>): SessionResponse {
  return {
    id: '3f1d5d4e-6a02-4d1c-9a2b-8f9c0c1d2e30',
    current: false,
    created_at: '2026-08-20T09:00:00Z',
    last_used_at: '2026-08-29T08:30:00Z',
    expires_at: '2026-09-19T09:00:00Z',
    ip: '203.0.113.7',
    label: '',
    user_agent: AGENTS.chromeWindows,
    ...patch,
  }
}

function listBody(items: SessionResponse[]) {
  return { items, total: items.length }
}

async function renderSessions(items: SessionResponse[]) {
  const rendered = renderWithProviders(<DeviceList />)
  rendered.queryClient.setQueryData(deviceSessionsQueryKey, listBody(items))
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(items.length))
  return rendered
}

function glyphPathFor(row: HTMLElement, name: string): string | null {
  const mark = row.querySelector(`[data-device-glyph="${name}"] path`)
  return mark?.getAttribute('d') ?? null
}

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('device glyphs', () => {
  it('draws the mark of the very browser the agent names, not of another one', async () => {
    await renderSessions([
      session({ id: 'a', user_agent: AGENTS.chromeWindows }),
      session({ id: 'b', user_agent: AGENTS.firefoxLinux }),
    ])

    const [chromeRow, firefoxRow] = screen.getAllByRole('listitem')
    if (!chromeRow || !firefoxRow) throw new Error('both device rows must be on screen')

    expect(glyphPathFor(chromeRow, 'Chrome')).toBe(BROWSER_GLYPHS.Chrome.path)
    expect(glyphPathFor(firefoxRow, 'Firefox')).toBe(BROWSER_GLYPHS.Firefox.path)
    expect(glyphPathFor(chromeRow, 'Chrome')).not.toBe(BROWSER_GLYPHS.Firefox.path)
  })

  it('draws the mark of the very platform the agent names', async () => {
    await renderSessions([
      session({ id: 'a', user_agent: AGENTS.chromeWindows }),
      session({ id: 'b', user_agent: AGENTS.safariIphone }),
    ])

    const [windowsRow, iosRow] = screen.getAllByRole('listitem')
    if (!windowsRow || !iosRow) throw new Error('both device rows must be on screen')

    expect(glyphPathFor(windowsRow, 'Windows')).toBe(PLATFORM_GLYPHS.Windows?.path)
    expect(glyphPathFor(iosRow, 'iOS')).toBe(PLATFORM_GLYPHS.iOS?.path)
  })

  it('gives every wordless mark an accessible name of its own', async () => {
    await renderSessions([session({ id: 'a', user_agent: AGENTS.chromeWindows })])

    for (const name of ['Chrome', 'Windows']) {
      const mark = document.querySelector(`[data-device-glyph="${name}"]`)
      expect(mark, `the ${name} mark must be on screen`).not.toBeNull()
      expect(
        mark?.textContent,
        `the ${name} mark is wordless and needs a name a screen reader can read`,
      ).toBe(name)
      expect(mark?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('names the mark in the tooltip the same way it names it to a screen reader', async () => {
    const { user } = await renderSessions([session({ id: 'a', user_agent: AGENTS.chromeWindows })])

    const mark = document.querySelector('[data-device-glyph="Chrome"]')
    if (!(mark instanceof HTMLElement)) throw new Error('the Chrome mark is missing')

    await user.hover(mark)

    await waitFor(() => {
      const tips = screen.getAllByRole('tooltip')
      expect(tips.some((tip) => tip.textContent === 'Chrome')).toBe(true)
    })
  })

  it('reads Yandex Browser as Yandex, though its agent also says Chrome', async () => {
    expect(describeDevice(AGENTS.yandexWindows).browser).toBe('Yandex')

    await renderSessions([session({ id: 'a', user_agent: AGENTS.yandexWindows })])

    const [row] = screen.getAllByRole('listitem')
    if (!row) throw new Error('the device row must be on screen')

    expect(glyphPathFor(row, 'Yandex')).toBe(BROWSER_GLYPHS.Yandex.path)
    expect(row.querySelector('[data-device-glyph="Chrome"]')).toBeNull()
  })

  it('falls back to a wordless placeholder for a platform with no mark of its own', async () => {
    await renderSessions([
      session({
        id: 'a',
        user_agent:
          'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      }),
    ])

    const mark = document.querySelector('[data-device-glyph="ChromeOS"]')
    expect(mark, 'an unmarked platform still needs a mark slot').not.toBeNull()
    expect(mark?.textContent, 'and it still needs its name').toBe('ChromeOS')
    expect(PLATFORM_GLYPHS.ChromeOS, 'ChromeOS has no brand mark in the set').toBeUndefined()
  })

  it('carries a mark for every browser and platform the product can name', () => {
    for (const agent of Object.values(AGENTS)) {
      const { browser } = describeDevice(agent)
      expect(browser, `${agent} names no browser`).not.toBeNull()
      if (browser) expect(BROWSER_GLYPHS[browser], `no mark for ${browser}`).toBeDefined()
    }
  })
})
