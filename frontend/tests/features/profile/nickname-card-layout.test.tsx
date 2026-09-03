import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { NicknameCard } from '@/features/profile/nickname-card/nickname-card'
import { i18n } from '@/shared/i18n/config'

function renderCard(props: { nickname?: string | null; profilePublic?: boolean } = {}) {
  return renderWithProviders(
    <NicknameCard nickname={props.nickname ?? null} profilePublic={props.profilePublic ?? false} />,
  )
}

function nicknameInput(): HTMLInputElement {
  return screen.getByLabelText(i18n.t('profile.nickname')) as HTMLInputElement
}

function openLink(): HTMLAnchorElement | null {
  return screen.queryByRole('link', { name: i18n.t('profile.publicProfileLink') })
}

describe('the card does not spend a row on a label the field already shows', () => {
  it('names the field for screen readers without printing a caption above it', () => {
    renderCard({ nickname: 'ivan' })
    const label = document.querySelector('label[for="nickname"]') as HTMLElement

    expect(label).toHaveTextContent(i18n.t('profile.nickname'))
    expect(label).toHaveClass('sr-only')
    expect(nicknameInput()).toHaveAccessibleName(i18n.t('profile.nickname'))
  })

  it('leaves no visible text between the card title and the address field', () => {
    renderCard({ nickname: 'ivan' })
    const heading = screen.getByRole('heading', { name: i18n.t('profile.nickname') })
    const control = nicknameInput().parentElement as HTMLElement

    const between: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node !== null) {
      const parent = node.parentElement
      const after = heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
      const before = control.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING
      const inside = parent !== null && (control.contains(parent) || heading.contains(parent))
      const shown = parent !== null && parent.closest('.sr-only') === null
      if (after && before && !inside && shown && (node.textContent ?? '').trim() !== '') {
        between.push((node.textContent ?? '').trim())
      }
      node = walker.nextNode()
    }
    expect(between).toEqual([])
  })
})

describe('saving the address costs no row of its own', () => {
  it('puts the save button in the same row as the field, not beneath it', () => {
    renderCard({ nickname: 'ivan' })
    const save = screen.getByRole('button', { name: i18n.t('action.save') })
    const input = nicknameInput()
    const row = save.parentElement as HTMLElement

    expect(row.contains(input)).toBe(true)
    expect(row.className).toContain('flex')
    expect(row.className).not.toContain('flex-col')
  })

  it('keeps the button beside the field rather than stretched across it', () => {
    renderCard({ nickname: 'ivan' })
    const save = screen.getByRole('button', { name: i18n.t('action.save') })

    expect(save.className).toContain('shrink-0')
    expect(save.className).not.toContain('w-full')
  })
})

describe('the visibility row is built like every other labelled control', () => {
  it('gives the switch a real label element, not a loose paragraph', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const label = document.querySelector('label[for="profile-public"]') as HTMLElement

    expect(label).not.toBeNull()
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveTextContent(i18n.t('profile.visibilityLabel'))
  })

  it('ties the explanation to the switch through aria-describedby', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const toggle = screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })
    const describedBy = toggle.getAttribute('aria-describedby')

    expect(describedBy).toBe('profile-public-hint')
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      i18n.t('profile.visibilityHint'),
    )
  })

  it('sets the label and control side by side, the way a settings row reads', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const toggle = screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })
    const row = toggle.parentElement as HTMLElement

    expect(row.className).toContain('items-center')
    expect(row.className).toContain('justify-between')
    expect(row.className).not.toContain('flex-col')
  })

  it('states the rule without claiming which way the switch currently sits', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const hint = document.getElementById('profile-public-hint') as HTMLElement

    expect(hint).toHaveTextContent(i18n.t('profile.visibilityHint'))
    expect(hint.textContent ?? '').not.toMatch(/^Off,/)
  })
})

describe('the nickname and the visibility are never merged', () => {
  it('keeps the address private until the switch is turned on', () => {
    renderCard({ nickname: 'ivan', profilePublic: false })

    expect(nicknameInput().value).toBe('ivan')
    expect(screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })).toHaveAttribute(
      'data-state',
      'unchecked',
    )
    expect(openLink()).toBeNull()
  })

  it('offers the switch and the address as two separate controls', () => {
    renderCard({ nickname: 'ivan', profilePublic: true })
    const toggle = screen.getByRole('switch', { name: i18n.t('profile.visibilityLabel') })

    expect(toggle.contains(nicknameInput())).toBe(false)
    expect(nicknameInput().contains(toggle)).toBe(false)
  })
})
