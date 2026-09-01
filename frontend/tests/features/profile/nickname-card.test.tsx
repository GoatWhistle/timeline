import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { NicknameCard } from '@/features/profile/nickname-card/nickname-card'
import { nicknameProblem } from '@/shared/forms/nickname'
import { i18n } from '@/shared/i18n/config'

function renderCard(props: { nickname?: string | null; profilePublic?: boolean } = {}) {
  return renderWithProviders(
    <NicknameCard nickname={props.nickname ?? null} profilePublic={props.profilePublic ?? false} />,
  )
}

function nicknameInput(): HTMLInputElement {
  return screen.getByLabelText(i18n.t('profile.nicknameLinkLabel')) as HTMLInputElement
}

function openLink(): HTMLAnchorElement | null {
  return screen.queryByRole('link', { name: i18n.t('profile.publicProfileLink') })
}

describe('the nickname field reads as the public profile address', () => {
  it('shows the address prefix next to the editable segment', () => {
    renderCard({ nickname: 'ivan' })
    const field = nicknameInput().closest('div') as HTMLElement
    expect(within(field).getByText('/@', { exact: false })).toBeInTheDocument()
  })

  it('changes the visible address as the nickname is typed', async () => {
    const { user } = renderCard()
    const input = nicknameInput()
    await user.type(input, 'petrov')
    expect(input.value).toBe('petrov')
  })

  it('offers exactly one editable field, so the prefix is not a second one', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    expect(document.querySelectorAll('input')).toHaveLength(1)
  })

  it('hides the prefix from screen readers, so it is not announced as a field', () => {
    renderCard({ nickname: 'ivan' })
    const prefix = screen.getByText('/@', { exact: false })
    expect(prefix.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('does not repeat the nickname anywhere outside the field', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    expect(screen.queryAllByText(/ivan/)).toHaveLength(0)
    expect(nicknameInput().value).toBe('ivan')
  })
})

describe('each broken rule is named on its own', () => {
  it('picks the character rule only when a character is not permitted', () => {
    expect(nicknameProblem('ivan petrov')).toBe('auth:validation.nicknameChars')
    expect(nicknameProblem('\u0438\u0432\u0430\u043d')).toBe('auth:validation.nicknameChars')
    expect(nicknameProblem('ivan!')).toBe('auth:validation.nicknameChars')
  })

  it('picks the minimum rule for something too short', () => {
    expect(nicknameProblem('ab')).toBe('auth:validation.nicknameMin')
    expect(nicknameProblem('a')).toBe('auth:validation.nicknameMin')
  })

  it('picks the maximum rule for something too long', () => {
    expect(nicknameProblem('a'.repeat(40))).toBe('auth:validation.nicknameMax')
    expect(nicknameProblem('a'.repeat(39))).toBeNull()
  })

  it('picks the edge rule for permitted characters in a forbidden place', () => {
    expect(nicknameProblem('my-handle-')).toBe('auth:validation.nicknameEdges')
    expect(nicknameProblem('_ivan')).toBe('auth:validation.nicknameEdges')
    expect(nicknameProblem('-ivan-')).toBe('auth:validation.nicknameEdges')
  })

  it('never lumps a trailing hyphen into the character rule, which would baffle', () => {
    expect(nicknameProblem('my-handle-')).not.toBe('auth:validation.nicknameChars')
  })

  it('finds nothing wrong with an acceptable nickname or an empty one', () => {
    expect(nicknameProblem('ivan')).toBeNull()
    expect(nicknameProblem('ivan_petrov-42')).toBeNull()
    expect(nicknameProblem('')).toBeNull()
  })
})

describe('validation of the address segment on screen', () => {
  it('says nothing at all before the user tries to save', async () => {
    const { user } = renderCard()
    await user.type(nicknameInput(), '-bad-')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows no standing rule text next to a clean field', () => {
    renderCard({ nickname: 'ivan' })
    expect(document.querySelector('#nickname-hint')).toBeNull()
    expect(nicknameInput()).not.toHaveAttribute('aria-describedby')
  })

  it('surfaces only the rule that was broken, not the whole list', async () => {
    const { user } = renderCard()
    const input = nicknameInput()
    await user.type(input, 'ab')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(i18n.t('auth:validation.nicknameMin'))
    expect(alert).not.toHaveTextContent(i18n.t('auth:validation.nicknameChars'))
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('names the permitted characters when the user typed a forbidden one', async () => {
    const { user } = renderCard()
    await user.type(nicknameInput(), 'ivan petrov')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(i18n.t('auth:validation.nicknameChars'))
  })

  it('carries the invalid state on the whole control, not only the inner input', async () => {
    const { user } = renderCard()
    const input = nicknameInput()
    await user.type(input, '-bad-')
    await user.click(screen.getByRole('button', { name: i18n.t('action.save') }))

    await screen.findByRole('alert')
    expect(input.parentElement).toHaveAttribute('data-invalid')
  })

  it('leaves a valid nickname without any complaint about its shape', async () => {
    const { user } = renderCard()
    const input = nicknameInput()
    await user.type(input, 'ivan')
    await user.tab()

    expect(nicknameProblem(input.value)).toBeNull()
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input.parentElement).not.toHaveAttribute('data-invalid')
  })
})

describe('the affordance that opens the public profile', () => {
  it('appears when a saved nickname is published', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    expect(openLink()).toHaveAttribute('href', '/@ivan')
  })

  it('stays away while the profile is private', () => {
    renderCard({ nickname: 'ivan', profilePublic: false })
    expect(openLink()).toBeNull()
  })

  it('stays away while there is no nickname at all', () => {
    renderCard({ nickname: null, profilePublic: true })
    expect(openLink()).toBeNull()
  })
})

describe('the visibility switch stays a separate control', () => {
  it('is offered next to the address, not merged into it', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const toggle = screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })
    expect(toggle).toHaveAttribute('data-state', 'checked')
  })

  it('cannot be turned on before a nickname exists', () => {
    renderCard({ nickname: null })
    expect(screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })).toBeDisabled()
    expect(screen.getByText(i18n.t('profile.nicknameEmpty'))).toBeInTheDocument()
  })
})
