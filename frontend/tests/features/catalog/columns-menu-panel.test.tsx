import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATALOG_COLUMNS } from '@/entities/catalog/catalog.views'
import { CatalogColumnsMenu } from '@/features/catalog/catalog-columns-menu'
import { i18n, i18nReady } from '@/shared/i18n/config'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

function menu(columns = [...DEFAULT_CATALOG_COLUMNS], onReset = vi.fn()) {
  return renderWithProviders(
    <CatalogColumnsMenu columns={columns} onToggle={vi.fn()} onReset={onReset} />,
  )
}

describe('the columns control works like the filters control', () => {
  it('is an icon on the bar that names itself only to a screen reader', () => {
    menu()
    const trigger = screen.getByRole('button', { name: 'Columns' })
    expect(trigger.textContent?.trim(), 'the word came back onto the button').toBe('')
  })

  it('opens a panel titled Columns, with no reset while nothing has changed', async () => {
    const { user } = menu()
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    const panel = await screen.findByRole('dialog', { name: 'Columns' })
    const head = panel.querySelector('[data-panel-head]') as HTMLElement
    expect(within(head).getByText('Columns')).toBeTruthy()
    expect(panel.getAttribute('data-align'), 'the panel drifts to one side of its button').toBe(
      'center',
    )
    expect(within(panel).queryByRole('button', { name: 'Reset to default' })).toBeNull()
  })

  it('offers reset as the turning arrow in the header once the columns differ', async () => {
    const onReset = vi.fn()
    const { user } = menu(['title'], onReset)
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    const panel = await screen.findByRole('dialog', { name: 'Columns' })
    const head = panel.querySelector('[data-panel-head]') as HTMLElement
    const reset = within(head).getByRole('button', { name: 'Reset to default' })
    expect(reset.querySelector('svg.lucide-rotate-ccw')).toBeTruthy()
    expect(reset.textContent?.trim()).toBe('')
    await user.click(reset)
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('keeps no second reset at the foot of the list', async () => {
    const { user } = menu(['title'])
    await user.click(screen.getByRole('button', { name: 'Columns' }))
    const panel = await screen.findByRole('dialog', { name: 'Columns' })
    expect(within(panel).getAllByRole('button', { name: 'Reset to default' })).toHaveLength(1)
  })
})
