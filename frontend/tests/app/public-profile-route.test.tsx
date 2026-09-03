import { screen, waitFor } from '@testing-library/react'
import { text } from '@tests/support/dictionaries'
import { renderWithProviders } from '@tests/support/render'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { PublicProfileRoute } from '@/app/public-profile-route'
import { i18n } from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n/i18n-context'
import { LOCALES, type Locale, writeStoredLocale } from '@/shared/i18n/locale'
import {
  isPublicProfileHandle,
  profileNickname,
  publicProfilePath,
} from '@/shared/routing/public-profile-path'

async function renderAt(route: string, locale: Locale = 'ru') {
  writeStoredLocale(locale)
  await i18n.changeLanguage(locale)
  return renderWithProviders(
    <I18nProvider>
      <Routes>
        <Route path="/:handle" element={<PublicProfileRoute />} />
      </Routes>
    </I18nProvider>,
    { route },
  )
}

function notFoundTitle(locale: Locale): string {
  return text(locale, 'common', 'page.notFoundTitle')
}

function profileMissingTitle(locale: Locale): string {
  return text(locale, 'common', 'profile.publicNotFound')
}

async function notFoundHeading(locale: Locale) {
  return await screen.findByRole('heading', { name: notFoundTitle(locale) })
}

beforeEach(() => {
  writeStoredLocale('ru')
})

describe('an address without @ is not a profile', () => {
  it.each(['/tea', '/nonsense', '/some-old-link', '/Tea', '/settings-typo'])(
    'renders the not-found page at %s',
    async (route) => {
      await renderAt(route)
      expect(await notFoundHeading('ru')).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: profileMissingTitle('ru') }),
      ).not.toBeInTheDocument()
    },
  )

  it('never shows the closed-profile wording for a plain mistyped path', async () => {
    await renderAt('/tea')
    await notFoundHeading('ru')
    for (const locale of LOCALES) {
      expect(document.body.textContent).not.toContain(
        text(locale, 'common', 'profile.publicNotFoundHint'),
      )
      expect(document.body.textContent).not.toContain(profileMissingTitle(locale))
    }
  })

  it('treats a bare @ with no nickname as not found', async () => {
    await renderAt('/@')
    expect(await notFoundHeading('ru')).toBeInTheDocument()
  })

  it.each(LOCALES)('reports the not-found page in %s', async (locale) => {
    await renderAt('/tea', locale)
    expect(await notFoundHeading(locale)).toBeInTheDocument()
    expect(document.body.textContent).toContain(text(locale, 'common', 'page.notFoundHint'))
  })
})

describe('an address with @ is still a profile', () => {
  it.each(['/@ivan', publicProfilePath('ivan'), '/@a', '/@ivan-petrov_1'])(
    'does not render the not-found page at %s',
    async (route) => {
      await renderAt(route)
      await waitFor(() => {
        expect(document.body.textContent).not.toBe('')
      })
      expect(screen.queryByRole('heading', { name: notFoundTitle('ru') })).not.toBeInTheDocument()
    },
  )
})

describe('the profile handle shape', () => {
  it.each([
    ['@ivan', 'ivan'],
    ['@a', 'a'],
    ['@ivan-petrov_1', 'ivan-petrov_1'],
  ])('reads %s as the nickname %s', (handle, nickname) => {
    expect(profileNickname(handle)).toBe(nickname)
    expect(isPublicProfileHandle(handle)).toBe(true)
  })

  it.each(['tea', '', '@', 'ivan@', 'a@b', 'Tea'])('rejects %s', (handle) => {
    expect(profileNickname(handle)).toBeNull()
    expect(isPublicProfileHandle(handle)).toBe(false)
  })

  it('builds the link the router accepts', () => {
    expect(publicProfilePath('ivan')).toBe('/@ivan')
    expect(isPublicProfileHandle(publicProfilePath('ivan').slice(1))).toBe(true)
  })
})
