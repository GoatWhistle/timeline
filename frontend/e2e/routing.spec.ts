import { expect, type Page, test } from '@playwright/test'
import { createMember } from './support/accounts'

let email = ''
let password = ''
let nickname = ''

const NOT_FOUND = /страница не найдена|page not found/i
const NO_PROFILE = /такого профиля нет|no such profile/i

test.beforeAll(async () => {
  const member = await createMember()
  email = member.email
  password = member.password
  nickname = member.nickname
})

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(password)
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()
  await expect(page).toHaveURL(/\/events/)
}

test('an unknown address answers with the not-found page, not a closed profile', async ({
  page,
}) => {
  await page.goto('/tea')

  await expect(page.getByRole('heading', { name: NOT_FOUND })).toBeVisible()
  await expect(page.getByRole('heading', { name: NO_PROFILE })).toHaveCount(0)
  await expect(page).toHaveURL(/\/tea$/)
})

test('an unknown nested address answers the same way', async ({ page }) => {
  await page.goto('/tea/pot')

  await expect(page.getByRole('heading', { name: NOT_FOUND })).toBeVisible()
  await expect(page.getByRole('heading', { name: NO_PROFILE })).toHaveCount(0)
})

test('a signed-in visitor also gets the not-found page for an unknown address', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/tea')

  await expect(page.getByRole('heading', { name: NOT_FOUND })).toBeVisible()
  await expect(page.getByRole('heading', { name: NO_PROFILE })).toHaveCount(0)
})

test('an address with @ is read as a profile, not as a missing page', async ({ page }) => {
  await page.goto('/@nobodyatall')

  await expect(page.getByRole('heading', { name: NO_PROFILE })).toBeVisible()
  await expect(page.getByRole('heading', { name: NOT_FOUND })).toHaveCount(0)
  await expect(page).toHaveURL(/\/@nobodyatall$/)
})

test('a closed profile reads exactly like a missing one', async ({ page }) => {
  await page.goto('/@nobodyatall')
  await expect(page.getByRole('heading', { name: NO_PROFILE })).toBeVisible()
  const missing = (await page.locator('body').innerText()).replace('nobodyatall', 'HANDLE')

  await page.goto(`/@${nickname}`)
  await expect(page.getByRole('heading', { name: NO_PROFILE })).toBeVisible()
  const closed = (await page.locator('body').innerText()).replace(nickname, 'HANDLE')

  expect(closed).toBe(missing)
})

test('my events answers on /events, and the root redirects there', async ({ page }) => {
  await signIn(page)

  await page.goto('/')
  await expect(page).toHaveURL(/\/events$/)

  await page.goto('/events')
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('the sidebar sends the participant to /events by name', async ({ page }) => {
  await signIn(page)
  await page.goto('/catalog')

  await page.getByRole('link', { name: /мои события|my events/i }).click()

  await expect(page).toHaveURL(/\/events$/)
})

test('a logged-out visitor is still sent to the login form from the app itself', async ({
  page,
}) => {
  await page.goto('/events')
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/catalog')
  await expect(page).toHaveURL(/\/login/)
})
