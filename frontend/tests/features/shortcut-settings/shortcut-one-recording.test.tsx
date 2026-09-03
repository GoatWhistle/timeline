import { screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import {
  appRegistry,
  changeButtons,
  drafts,
  renderWith,
  saveButtons,
  shortcut,
  twoRowRegistry,
} from './harness'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('only one row records at a time', () => {
  it('closes the first recording when a second pencil is clicked', async () => {
    const { user } = renderWith(twoRowRegistry())

    expect(changeButtons()).toHaveLength(2)

    await user.click(changeButtons()[0] as HTMLElement)
    expect(saveButtons()).toHaveLength(1)

    await user.click(changeButtons()[0] as HTMLElement)
    expect(saveButtons()).toHaveLength(1)
    expect(drafts()).toHaveLength(1)
  })

  it('leaves the row that lost the recording showing its own keys again', async () => {
    const { user } = renderWith(twoRowRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    await user.click(changeButtons()[0] as HTMLElement)

    expect(screen.getByText('k')).toBeInTheDocument()
    expect(drafts('combo')).toHaveLength(0)
  })

  it('sends one keypress to one row only, so two rows cannot record the same key', async () => {
    const { user } = renderWith(twoRowRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')

    expect(drafts('combo')).toHaveLength(1)
  })
})

describe('refusing a combination, and saying why', () => {
  it('refuses a combination another action already holds and names that action', async () => {
    const registry = appRegistry()
    registry.push({
      id: 'catalog-list',
      mode: 'normal',
      shortcuts: [shortcut('list-next', ['j'], 'shortcuts.listNext')],
    })
    const { user } = renderWith(registry)

    await user.click(changeButtons()[1] as HTMLElement)
    await user.keyboard('{Control>}k{/Control}')
    await user.click(saveButtons()[0] as HTMLElement)

    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('common:shortcuts.rejectConflict', { action: i18n.t('common:shortcuts.palette') }),
    )
  })

  it('refuses a combination the browser takes, and says so', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}w{/Control}')
    await user.click(saveButtons()[0] as HTMLElement)

    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('common:shortcuts.reservedBrowser'))
  })

  it('refuses a key the interface needs to move focus', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Tab}')
    await user.click(saveButtons()[0] as HTMLElement)

    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('common:shortcuts.reservedFocus'))
  })

  it('keeps the row recording after a refusal, so the person can try another key', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}w{/Control}')
    await user.click(saveButtons()[0] as HTMLElement)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(saveButtons()).toHaveLength(1)

    await user.keyboard('{Control>}1{/Control}')
    expect(drafts('combo')[0]?.textContent).toBe('Ctrl1')
  })
})
