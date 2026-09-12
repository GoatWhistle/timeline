import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { lazy, StrictMode } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthOutletSwap } from '@/app/auth-outlet-swap'

function LoginStub() {
  return (
    <div>
      <input aria-label="email" />
      <Nav to="/register" label="go register" />
    </div>
  )
}

function RegisterStub() {
  return (
    <div>
      <input aria-label="first name" />
      <input aria-label="last name" />
      <Nav to="/login" label="go login" />
    </div>
  )
}

function OtherStub() {
  return <p>elsewhere</p>
}

function Nav({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      {label}
    </button>
  )
}

function renderDoor(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<AuthOutletSwap />}>
          <Route path="/login" element={<LoginStub />} />
          <Route path="/register" element={<RegisterStub />} />
          <Route path="/forgot-password" element={<OtherStub />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthOutletSwap: the door swaps its card without the layout jumping', () => {
  it('renders the entry route plainly on first paint, no wrapper grid', () => {
    const { container } = renderDoor('/login')
    expect(screen.getByLabelText('email')).toBeInTheDocument()
    expect(container.querySelector('.grid')).toBeNull()
  })

  it('moves focus to the first field of the incoming card after navigating in', async () => {
    renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    expect(await screen.findByLabelText('first name')).toHaveFocus()
  })

  it('moves focus back to the first field of the login card on the way back', async () => {
    renderDoor('/register')
    act(() => {
      screen.getByRole('button', { name: 'go login' }).click()
    })
    expect(await screen.findByLabelText('email')).toHaveFocus()
  })

  it('keeps both cards mounted for the brief handoff, outgoing one marked hidden', () => {
    renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    const outgoing = screen.getByLabelText('email').closest('[aria-hidden]')
    expect(outgoing).toHaveAttribute('aria-hidden', 'true')
  })

  it('slides the incoming register card in from the right, login exits to the left', () => {
    const { container } = renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    const incoming = screen.getByLabelText('first name').closest('[class*="grid-area"]')
    const outgoing = screen.getByLabelText('email').closest('[class*="grid-area"]')
    expect(incoming?.className).toMatch(/motion-safe:translate-x-3(?!\S)/)
    expect(incoming?.className).not.toContain('motion-safe:-translate-x-3')
    expect(outgoing?.className).toContain('motion-safe:-translate-x-3')
    expect(container.querySelector('.inline-grid')).not.toBeNull()
  })

  it('slides the incoming login card in from the left, register exits to the right', () => {
    renderDoor('/register')
    act(() => {
      screen.getByRole('button', { name: 'go login' }).click()
    })
    const incoming = screen.getByLabelText('email').closest('[class*="grid-area"]')
    const outgoing = screen.getByLabelText('first name').closest('[class*="grid-area"]')
    expect(incoming?.className).toMatch(/motion-safe:-translate-x-3(?!\S)/)
    expect(outgoing?.className).toContain('motion-safe:translate-x-3')
    expect(outgoing?.className).not.toContain('motion-safe:-translate-x-3')
  })
})

function LazyRegisterStub() {
  return (
    <div>
      <input aria-label="lazy first name" />
    </div>
  )
}

const LazyRegister = lazy(
  () =>
    new Promise<{ default: typeof LazyRegisterStub }>((resolve) => {
      setTimeout(() => resolve({ default: LazyRegisterStub }), 30)
    }),
)

function renderLazyDoor() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route element={<AuthOutletSwap />}>
          <Route path="/login" element={<LoginStub />} />
          <Route path="/register" element={<LazyRegister />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthOutletSwap: the incoming card can arrive after a lazy chunk resolves', () => {
  it('still finds and focuses the field once the lazy card finishes mounting', async () => {
    renderLazyDoor()
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    await screen.findByLabelText('lazy first name')
    await waitFor(() => expect(screen.getByLabelText('lazy first name')).toHaveFocus())
  })

  it('keeps the outgoing login card on screen while the incoming chunk is still loading', () => {
    renderLazyDoor()
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    expect(screen.getByLabelText('email')).toBeInTheDocument()
  })
})

describe('AuthOutletSwap: the handoff wrapper survives settling, so focus is never dropped', () => {
  it('keeps the settled card inside the same wrapper node it entered through', async () => {
    renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    const field = await screen.findByLabelText('first name')
    expect(field).toHaveFocus()
    const wrapperDuringHandoff = field.closest('[class*="grid-area"]')
    expect(wrapperDuringHandoff).not.toBeNull()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'go register' })).not.toBeInTheDocument()
    })

    expect(field.closest('[class*="grid-area"]')).toBe(wrapperDuringHandoff)
    expect(screen.getByLabelText('first name')).toHaveFocus()
  })

  it('keeps a second handoff focused too, once the wrapper is permanent', async () => {
    renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    await screen.findByLabelText('first name')
    act(() => {
      screen.getByRole('button', { name: 'go login' }).click()
    })
    await waitFor(() => expect(screen.getByLabelText('email')).toHaveFocus())
  })
})

describe('AuthOutletSwap: the slide direction survives a double render', () => {
  function renderStrictDoor(initial: string) {
    return render(
      <StrictMode>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route element={<AuthOutletSwap />}>
              <Route path="/login" element={<LoginStub />} />
              <Route path="/register" element={<RegisterStub />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )
  }

  it('still slides left into register under StrictMode double rendering', () => {
    renderStrictDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    const incoming = screen.getByLabelText('first name').closest('[class*="grid-area"]')
    expect(incoming?.className).toMatch(/motion-safe:translate-x-3(?!\S)/)
    expect(incoming?.className).not.toContain('motion-safe:-translate-x-3')
  })
})

describe('AuthOutletSwap: a deliberate click during the handoff is not overridden', () => {
  it('leaves focus on the field the visitor clicked, instead of yanking it back', async () => {
    const user = userEvent.setup()
    renderDoor('/login')
    act(() => {
      screen.getByRole('button', { name: 'go register' }).click()
    })
    await screen.findByLabelText('first name')

    await user.click(screen.getByLabelText('last name'))

    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.getByLabelText('last name')).toHaveFocus()
  })
})
