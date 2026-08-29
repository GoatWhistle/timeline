import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { LINK_KIND_ICON, LINK_KIND_KEY, LINK_KINDS } from '@/entities/link/link.labels'
import { LinkItem } from '@/features/event-links/ui/link-list/link-item'
import { i18n } from '@/shared/i18n/config'
import { TooltipProvider } from '@/shared/ui/overlays/tooltip'

function render(props: Parameters<typeof LinkItem>[0]) {
  return renderWithProviders(
    <TooltipProvider>
      <LinkItem {...props} />
    </TooltipProvider>,
  )
}

describe('link kind taxonomy', () => {
  it('covers twelve kinds plus OTHER with an icon and a label each', () => {
    expect(LINK_KINDS).toHaveLength(12)
    expect(LINK_KINDS).toContain('OTHER')
    for (const kind of LINK_KINDS) {
      expect(LINK_KIND_ICON[kind], `icon for ${kind}`).toBeDefined()
      expect(LINK_KIND_KEY[kind], `label key for ${kind}`).toBeTruthy()
    }
  })

  it('names every kind in both languages', () => {
    for (const locale of ['ru', 'en'] as const) {
      const t = i18n.getFixedT(locale)
      for (const kind of LINK_KINDS) {
        const label = t(LINK_KIND_KEY[kind])
        expect(label, `${locale}/${kind}`).not.toBe(LINK_KIND_KEY[kind])
        expect(label, `${locale}/${kind}`).not.toHaveLength(0)
      }
    }
  })
})

describe('link item', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  it('falls back to the kind label when no title is given', () => {
    render({ kind: 'RULES', url: 'https://example.org/rules' })
    expect(screen.getByRole('link')).toHaveAccessibleName(
      new RegExp(i18n.t('event:linkKind.RULES')),
    )
  })

  it('prefers an explicit title over the kind label', () => {
    render({ kind: 'RULES', url: 'https://example.org/rules', title: 'House rules' })
    expect(screen.getByText('House rules')).toBeInTheDocument()
  })

  it('treats a blank title as absent', () => {
    render({ kind: 'CHAT', url: 'https://example.org/chat', title: '   ' })
    expect(screen.getByText(i18n.t('event:linkKind.CHAT'))).toBeInTheDocument()
  })

  it('carries noopener and noreferrer like every external link', () => {
    render({ kind: 'CHAT', url: 'https://example.org/chat' })
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks a non-HTTPS link without blocking it', () => {
    render({ kind: 'DATASET', url: 'http://example.org/data' })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'http://example.org/data')
    expect(screen.getByText(i18n.t('common:link.insecure'))).toBeInTheDocument()
  })
})
