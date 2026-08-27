import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/login/login'
import { MOCK_PASSWORD } from '@/mocks/fixtures'

function Harness() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Мои хакатоны</h1>} />
    </Routes>
  )
}

describe('Экран входа', () => {
  it('пускает в систему при верных учётных данных', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Пароль'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('heading', { name: 'Мои хакатоны' })).toBeInTheDocument()
  })

  it('показывает серверную ошибку при неверном пароле', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль')
    expect(screen.queryByRole('heading', { name: 'Мои хакатоны' })).not.toBeInTheDocument()
  })

  it('показывает и снова скрывает пароль по кнопке', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    const password = screen.getByLabelText('Пароль')
    await user.type(password, MOCK_PASSWORD)
    expect(password).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: 'Показать пароль' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }))
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password')
  })

  it('кнопка переключения видимости не отправляет форму', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Пароль'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Показать пароль' }))

    expect(screen.queryByRole('heading', { name: 'Мои хакатоны' })).not.toBeInTheDocument()
  })

  it('быстрый вход подставляет демо-учётную запись', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.click(screen.getByRole('button', { name: 'Участник' }))
    expect(screen.getByLabelText('Email')).toHaveValue('user@example.com')

    await user.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByRole('heading', { name: 'Мои хакатоны' })).toBeInTheDocument()
  })

  it('не отправляет форму при некорректном email', async () => {
    const { user } = renderWithProviders(<Harness />, { route: '/login' })

    await user.type(screen.getByLabelText('Email'), 'не-email')
    await user.type(screen.getByLabelText('Пароль'), MOCK_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByText('Укажите корректный адрес')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
