import { expect, test } from '@playwright/test'
import { createMember } from './support/accounts'

let email = ''
let password = ''

test.beforeAll(async () => {
  const member = await createMember()
  email = member.email
  password = member.password
})

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
})

test('signs in with valid credentials', async ({ page }) => {
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(password)
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()

  await expect(page).toHaveURL(/\/$|\/events/)
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('shows the server error for a wrong password', async ({ page }) => {
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill('wrong-password')
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('toggles password visibility back and forth', async ({ page }) => {
  const field = page.getByRole('textbox', { name: /пароль|password/i })
  await field.fill(password)
  await expect(field).toHaveAttribute('type', 'password')

  const show = page.getByRole('button', { name: /показать пароль|show password/i })
  await expect(show).toHaveAttribute('aria-pressed', 'false')
  await show.click()

  await expect(page.getByRole('textbox', { name: /пароль|password/i })).toHaveAttribute(
    'type',
    'text',
  )
  const hide = page.getByRole('button', { name: /скрыть пароль|hide password/i })
  await expect(hide).toHaveAttribute('aria-pressed', 'true')

  await hide.click()
  await expect(page.getByRole('textbox', { name: /пароль|password/i })).toHaveAttribute(
    'type',
    'password',
  )
})

test('does not submit the form from the visibility toggle', async ({ page }) => {
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(password)
  await page.getByRole('button', { name: /показать пароль|show password/i }).click()

  await expect(page).toHaveURL(/\/login/)
})

test('does not submit the form with a malformed email', async ({ page }) => {
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(password)
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()

  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/login/)
})

test('a signed-in session survives a reload', async ({ page }) => {
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(password)
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()
  await expect(page).toHaveURL(/\/$|\/events/)

  await page.reload()
  await expect(page).not.toHaveURL(/\/login/)
})
