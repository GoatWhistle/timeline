import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { TimezoneSelect } from '@/shared/ui/primitives/timezone-select/timezone-select'
import { clockIn, offsetOf } from '@/shared/ui/primitives/timezone-select/zone-list'

type View = ReturnType<typeof renderWithProviders> & { onChange: ReturnType<typeof vi.fn> }

function renderSelect(value = 'Europe/Moscow'): View {
  const onChange = vi.fn()
  const view = renderWithProviders(<TimezoneSelect value={value} onChange={onChange} />)
  return { ...view, onChange }
}

function trigger(): HTMLElement {
  return document.querySelector('[aria-haspopup="menu"]') as HTMLElement
}

async function openList(user: View['user']): Promise<HTMLElement> {
  await user.click(trigger())
  return await screen.findByRole('menu')
}

function zoneRows(): HTMLElement[] {
  return within(screen.getByRole('menu'))
    .queryAllByRole('button')
    .filter((node) => /\d{2}:\d{2}/.test(node.textContent ?? ''))
}

function searchBox(): HTMLInputElement {
  return screen.getByLabelText(i18n.t('timezone.search')) as HTMLInputElement
}

describe('the time zone reads as a clock, not as a list of names', () => {
  it('stays closed until asked, so it does not eat half the settings screen', () => {
    renderSelect()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows the chosen zone with both its clock and its offset', () => {
    renderSelect('Asia/Tokyo')
    expect(trigger().textContent).toContain(clockIn('Asia/Tokyo', new Date()))
    expect(trigger().textContent).toContain(offsetOf('Asia/Tokyo'))
  })

  it('spells the offset against UTC rather than GMT', () => {
    expect(offsetOf('Europe/Moscow')).toMatch(/^UTC/)
    expect(offsetOf('Europe/Moscow')).not.toContain('GMT')
  })

  it('gives every zone in the list its own clock', async () => {
    const { user } = renderSelect()
    await openList(user)
    expect(zoneRows().length).toBeGreaterThan(20)
  })

  it('groups the zones by region, so the list has structure rather than length', async () => {
    const { user } = renderSelect()
    const menu = await openList(user)
    const text = menu.textContent ?? ''
    expect(text).toContain('Europe')
    expect(text).toContain('Asia')
    expect(text).toContain('America')
  })

  it('narrows the list by city, because dozens of zones cannot be scanned', async () => {
    const { user } = renderSelect()
    await openList(user)
    await user.type(searchBox(), 'tokyo')

    const rows = zoneRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textContent).toContain('Tokyo')
  })

  it('says so plainly when nothing matches', async () => {
    const { user } = renderSelect()
    await openList(user)
    await user.type(searchBox(), 'zzzzz')

    expect(zoneRows()).toHaveLength(0)
    expect(screen.getByText(i18n.t('timezone.nothingFound'))).toBeInTheDocument()
  })

  it('reports the chosen zone and closes once a row is pressed', async () => {
    const { user, onChange } = renderSelect()
    await openList(user)
    await user.type(searchBox(), 'tokyo')
    await user.click(zoneRows()[0] as HTMLElement)

    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo')
  })

  it('marks the current choice with a tick, not with colour alone', async () => {
    const { user } = renderSelect('Asia/Tokyo')
    await openList(user)
    const current = zoneRows().find((row) => row.getAttribute('aria-current') === 'true')

    expect(current?.textContent).toContain('Tokyo')
    expect(current?.querySelector('svg')?.classList.contains('invisible')).toBe(false)
  })

  it('keeps the open and close motion behind motion-safe', async () => {
    const { user } = renderSelect()
    await openList(user)
    const icons = [...trigger().querySelectorAll('svg')]
    const chevron = icons[icons.length - 1]

    expect(chevron?.getAttribute('class')).toContain('motion-safe:transition-transform')
  })
})
