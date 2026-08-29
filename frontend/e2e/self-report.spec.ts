import { expect, type Page, test } from '@playwright/test'
import { type AssignedMember, memberWithOpenRegistration, statusOf } from './support/scenario'

let member: AssignedMember

test.beforeAll(async () => {
  member = await memberWithOpenRegistration()
})

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(member.email)
  await page.getByRole('textbox', { name: /пароль|password/i }).fill(member.password)
  await page.getByRole('button', { name: /^(войти|sign in)$/i }).click()
  await expect(page).toHaveURL(/\/$|\/events/)
}

test('an assigned participant sees the event that is waiting for a registration', async ({
  page,
}) => {
  await signIn(page)
  await expect(page.getByText(member.eventTitle).first()).toBeVisible()
})

test('the participant reports the registration and the server records DONE', async ({ page }) => {
  await signIn(page)

  expect(await statusOf(member.eventId)).toBe('TODO')

  const list = page.getByRole('listbox')
  await expect(list.getByRole('option').filter({ hasText: member.eventTitle })).toBeVisible()

  const mark = list.getByRole('button', { name: /^(отметить|mark)$/i })
  await expect(mark).toBeVisible()
  await mark.click()

  await expect(page.getByText(/регистрация отмечена|registration marked/i)).toBeVisible()

  await expect.poll(async () => statusOf(member.eventId), { timeout: 10_000 }).toBe('DONE')
})

test('the mark is gone after a reload, because the work is already reported', async ({ page }) => {
  await signIn(page)
  await page.reload()

  const list = page.getByRole('listbox')
  await expect(list.getByRole('option').filter({ hasText: member.eventTitle })).toBeVisible()
  await expect(list.getByRole('button', { name: /^(отметить|mark)$/i })).toHaveCount(0)
})
