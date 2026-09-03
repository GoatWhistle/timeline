import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { createMember } from './support/accounts'

type Tree = { [key: string]: string | Tree }
type Locale = 'ru' | 'en'

const LOCALES_ROOT = resolve(process.cwd(), 'src/shared/i18n/locales')

function text(locale: Locale, file: string, path: string): string {
  const tree = JSON.parse(
    readFileSync(resolve(LOCALES_ROOT, locale, `${file}.json`), 'utf8'),
  ) as Tree
  const node = path
    .split('.')
    .reduce<string | Tree | undefined>(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
      tree,
    )
  if (typeof node !== 'string') throw new Error(`missing ${locale}/${file}:${path}`)
  return node
}

const quote = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function either(file: string, path: string): RegExp {
  return new RegExp(`^(${quote(text('ru', file, path))}|${quote(text('en', file, path))})$`, 'i')
}

let email = ''
let password = ''
let nickname = ''

const NOT_FOUND = either('shell', 'page.notFoundTitle')
const NO_PROFILE = either('account', 'profile.publicNotFound')
const MY_EVENTS = either('shell', 'nav.events')
const PASSWORD = either('auth', 'field.password')
const SIGN_IN = either('auth', 'login.submit')

test.beforeAll(async () => {
  const member = await createMember()
  email = member.email
  password = member.password
  nickname = member.nickname
})

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(PASSWORD).fill(password)
  await page.getByRole('button', { name: SIGN_IN }).click()
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

  await page.getByRole('link', { name: MY_EVENTS }).click()

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
