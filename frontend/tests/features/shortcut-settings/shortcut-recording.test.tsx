import { screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import {
  appRegistry,
  cancelButtons,
  changeButtons,
  drafts,
  recordedVariables,
  renderWith,
  revertButtons,
  saveButtons,
} from './harness'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('what the screen shows while a combination is being recorded', () => {
  it('shows a held modifier the moment it goes down, before any other key', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()

    await user.keyboard('{Control>}')
    expect(drafts('held')).toHaveLength(1)
    expect(drafts('held')[0]?.textContent).toContain('Ctrl')
    await user.keyboard('{/Control}')
  })

  it('shows the whole combination the instant the second key lands, with nothing else clicked', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')

    expect(drafts('combo')).toHaveLength(1)
    expect(drafts('combo')[0]?.textContent).toBe('Ctrl1')
  })

  it('accepts a single letter as a whole shortcut and offers to save it', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('m')

    expect(drafts('combo')[0]?.textContent).toBe('m')
    expect(saveButtons()[0]).toBeEnabled()
  })

  it('keeps the prompt, and no save, until something has actually been pressed', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)

    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()
    expect(saveButtons()[0]).toBeDisabled()
  })

  it('replaces the draft when the person presses something else instead', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    await user.keyboard('{Alt>}2{/Alt}')

    expect(drafts('combo')[0]?.textContent).toBe('Alt2')
  })
})

describe('save, cancel and revert while recording', () => {
  it('offers all three controls, not the cancel cross alone', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)

    expect(saveButtons()).toHaveLength(1)
    expect(cancelButtons()).toHaveLength(1)
    expect(revertButtons()).toHaveLength(1)
  })

  it('stores nothing until save is pressed, then stores what was drawn', async () => {
    const { user, queryClient } = renderWith(appRegistry())
    const saved = recordedVariables(queryClient)

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    expect(saved).toEqual([])

    await user.click(saveButtons()[0] as HTMLElement)
    expect(saved).toEqual([{ 'command-palette': 'mod+1' }])
  })

  it('stores nothing when the cross is used instead, and puts the old keys back', async () => {
    const { user, queryClient } = renderWith(appRegistry())
    const saved = recordedVariables(queryClient)

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    await user.click(cancelButtons()[0] as HTMLElement)

    expect(saved).toEqual([])
    expect(screen.getByText('k')).toBeInTheDocument()
    expect(drafts()).toHaveLength(0)
  })

  it('drops the override when revert is pressed', async () => {
    const { user, queryClient } = renderWith(appRegistry(), { 'command-palette': 'mod+u' })
    const saved = recordedVariables(queryClient)

    await waitFor(() => expect(screen.getByText('u')).toBeInTheDocument())
    await user.click(revertButtons()[0] as HTMLElement)

    expect(saved).toEqual([{}])
  })

  it('offers a per-action revert only while that action carries an override', async () => {
    const { unmount } = renderWith(appRegistry())
    expect(revertButtons()[0]).toBeDisabled()
    unmount()

    renderWith(appRegistry(), { 'command-palette': 'mod+u' })
    await waitFor(() => expect(revertButtons()[0]).toBeEnabled())
  })

  it('offers a full reset only while something is overridden', async () => {
    const { unmount } = renderWith(appRegistry())
    expect(screen.getByRole('button', { name: i18n.t('common:shortcuts.resetAll') })).toBeDisabled()
    unmount()

    renderWith(appRegistry(), { 'command-palette': 'mod+u' })
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: i18n.t('common:shortcuts.resetAll') }),
      ).toBeEnabled()
    })
  })

  it('stops recording when the user backs out with escape', async () => {
    const { user } = renderWith(appRegistry())

    await user.click(changeButtons()[0] as HTMLElement)
    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(i18n.t('common:shortcuts.recording'))).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
