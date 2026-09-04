import { screen, waitFor, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import {
  cancelButtons,
  changeButtons,
  drafts,
  pencilFor,
  recordedVariables,
  renderWith,
  revertFor,
  rowNamed,
  saveButtons,
} from './harness'

beforeAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('what the screen shows while a combination is being recorded', () => {
  it('shows a held modifier the moment it goes down, before any other key', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)
    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()

    await user.keyboard('{Control>}')
    expect(drafts('held')).toHaveLength(1)
    expect(drafts('held')[0]?.textContent).toContain('Ctrl')
    await user.keyboard('{/Control}')
  })

  it('shows the whole combination the instant the second key lands, with nothing else clicked', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')

    expect(drafts('combo')).toHaveLength(1)
    expect(drafts('combo')[0]?.textContent).toBe('Ctrl1')
  })

  it('accepts a single letter as a whole shortcut and offers to save it', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('m')

    expect(drafts('combo')[0]?.textContent).toBe('m')
    expect(saveButtons()[0]).toBeEnabled()
  })

  it('keeps the prompt, and no save, until something has actually been pressed', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)

    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()
    expect(saveButtons()[0]).toBeDisabled()
  })

  it('replaces the draft when the person presses something else instead', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    await user.keyboard('{Alt>}2{/Alt}')

    expect(drafts('combo')[0]?.textContent).toBe('Alt2')
  })
})

describe('save, cancel and revert while recording', () => {
  it('offers all three controls, not the cancel cross alone', async () => {
    const { user } = renderWith()

    const row = rowNamed(i18n.t('common:shortcuts.palette'))
    await user.click(pencilFor(i18n.t('common:shortcuts.palette')))

    expect(saveButtons()).toHaveLength(1)
    expect(cancelButtons()).toHaveLength(1)
    expect(within(row).getAllByRole('button')).toHaveLength(3)
  })

  it('stores nothing until save is pressed, then stores what was drawn', async () => {
    const { user, queryClient } = renderWith()
    const saved = recordedVariables(queryClient)

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    expect(saved).toEqual([])

    await user.click(saveButtons()[0] as HTMLElement)
    expect(saved).toEqual([{ 'command-palette': 'mod+1' }])
  })

  it('stores nothing when the cross is used instead, and puts the old keys back', async () => {
    const { user, queryClient } = renderWith()
    const saved = recordedVariables(queryClient)

    await user.click(changeButtons()[0] as HTMLElement)
    await user.keyboard('{Control>}1{/Control}')
    await user.click(cancelButtons()[0] as HTMLElement)

    expect(saved).toEqual([])
    expect(within(rowNamed(i18n.t('common:shortcuts.palette'))).getByText('k')).toBeInTheDocument()
    expect(drafts()).toHaveLength(0)
  })

  it('drops the override when revert is pressed', async () => {
    const { user, queryClient } = renderWith({ 'command-palette': 'mod+u' })
    const saved = recordedVariables(queryClient)

    await waitFor(() => expect(screen.getByText('u')).toBeInTheDocument())
    await user.click(revertFor(i18n.t('common:shortcuts.palette')))

    expect(saved).toEqual([{}])
  })

  it('offers a per-action revert only while that action carries an override', async () => {
    const { unmount } = renderWith()
    expect(revertFor(i18n.t('common:shortcuts.palette'))).toBeDisabled()
    unmount()

    renderWith({ 'command-palette': 'mod+u' })
    await waitFor(() => expect(revertFor(i18n.t('common:shortcuts.palette'))).toBeEnabled())
  })

  it('reverts one shortcut at a time, offering no button that wipes them all', async () => {
    renderWith({ 'command-palette': 'mod+u' })
    await waitFor(() => expect(revertFor(i18n.t('common:shortcuts.palette'))).toBeEnabled())

    const wipesEverything = screen
      .getAllByRole('button')
      .filter((button) => /all/i.test(button.textContent ?? ''))

    expect(wipesEverything).toEqual([])
  })

  it('stops recording when the user backs out with escape', async () => {
    const { user } = renderWith()

    await user.click(changeButtons()[0] as HTMLElement)
    expect(screen.getByText(i18n.t('common:shortcuts.recording'))).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText(i18n.t('common:shortcuts.recording'))).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
