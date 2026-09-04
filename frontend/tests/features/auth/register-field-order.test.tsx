import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RegisterPage } from '@/features/auth/register/register'

function renderRegister() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ORDER = ['first_name', 'last_name', 'middle_name', 'nickname', 'email']

describe('the registration form groups the name parts before the nickname', () => {
  it('lays the fields out in the order the eye should walk them', () => {
    const { container } = renderRegister()
    const ids = [...container.querySelectorAll('input')]
      .map((input) => input.id)
      .filter((id) => ORDER.includes(id))

    expect(ids).toEqual(ORDER)
  })

  it('puts the middle name directly after the last name, not after the nickname', () => {
    const { container } = renderRegister()
    const ids = [...container.querySelectorAll('input')].map((input) => input.id)

    expect(ids.indexOf('middle_name')).toBeGreaterThan(ids.indexOf('last_name'))
    expect(ids.indexOf('middle_name')).toBeLessThan(ids.indexOf('nickname'))
  })

  it('carries each label with its own field as the pair moved', () => {
    renderRegister()
    const middle = screen.getByLabelText(/middle name/i)
    const nickname = screen.getByLabelText(/nickname/i)

    expect(middle.id).toBe('middle_name')
    expect(nickname.id).toBe('nickname')
  })

  it('keeps the nickname required and the middle name optional after the swap', () => {
    renderRegister()
    const labelOf = (id: string) => document.querySelector(`label[for="${id}"]`)?.textContent ?? ''

    expect(labelOf('nickname')).toContain('*')
    expect(labelOf('middle_name')).not.toContain('*')
  })

  it('walks the keyboard through the fields in that same order', () => {
    const { container } = renderRegister()
    const focusable = [...container.querySelectorAll('input')]
      .filter((input) => input.type !== 'hidden' && !input.disabled)
      .map((input) => input.id)
      .filter((id) => ORDER.includes(id))

    expect(focusable).toEqual(ORDER)
  })
})
