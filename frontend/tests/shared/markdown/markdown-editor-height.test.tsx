import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n, i18nReady } from '@/shared/i18n/config'
import { MarkdownEditor } from '@/shared/markdown/markdown-editor'

beforeAll(async () => {
  await i18nReady
  await i18n.changeLanguage('en')
})

function renderEditor() {
  return renderWithProviders(<MarkdownEditor id="bio" value="hello" onChange={() => {}} rows={4} />)
}

function pane() {
  const node = document.querySelector('#bio') ?? document.querySelector('[data-markdown-preview]')
  if (node === null) throw new Error('no editing surface')
  return node.parentElement as HTMLElement
}

describe('switching to preview does not resize the editor', () => {
  it('holds both panes in one grid cell so neither can push the other', async () => {
    const { user } = renderEditor()
    const before = pane()

    expect(before.className, 'the surfaces need a shared box to sit in').toContain('grid')
    expect(
      before.className,
      'that box must reserve its height, or the card jumps on toggle',
    ).toMatch(/min-h-/)

    await user.click(screen.getByRole('button', { name: i18n.t('common:markdown.preview') }))

    expect(pane(), 'preview must reuse the same box, not a taller one of its own').toBe(before)
  })

  it('stacks both surfaces on the same grid area', async () => {
    const { user } = renderEditor()
    expect((document.querySelector('#bio') as HTMLElement).className).toContain('[grid-area:1/1]')

    await user.click(screen.getByRole('button', { name: i18n.t('common:markdown.preview') }))

    const preview = document.querySelector('[data-markdown-preview]') as HTMLElement
    expect(preview.className).toContain('[grid-area:1/1]')
    expect(preview.className, 'a fixed preview height is what caused the jump').not.toMatch(
      /min-h-32/,
    )
  })
})
