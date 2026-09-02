import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/shared/i18n/config'

const save = vi.fn()
let body = ''

vi.mock('@/entities/personal/note.queries', async () => {
  const { queryOptions } = await import('@tanstack/react-query')
  return {
    NOTE_MAX: 20000,
    noteQuery: (eventId: string) =>
      queryOptions({ queryKey: ['personal-note', eventId], queryFn: () => body, retry: false }),
    useSaveNote: () => ({ mutateAsync: save, isPending: false }),
  }
})

const { NotePanel } = await import('@/features/personal-layer/note/note-panel')

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  save.mockReset()
  save.mockResolvedValue({})
  body = ''
})

describe('the note screen', () => {
  it('opens on the stored markdown source rather than rendered html', async () => {
    body = '# Heading\n\n**bold**'
    renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    const field = await screen.findByLabelText(i18n.t('event:personal.note.label'))
    expect(field).toHaveValue('# Heading\n\n**bold**')
  })

  it('saves what was typed without any extra press', async () => {
    const { user } = renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    const field = await screen.findByLabelText(i18n.t('event:personal.note.label'))
    await user.type(field, 'remember the wifi password')
    field.blur()

    await waitFor(() => expect(save).toHaveBeenCalledWith('remember the wifi password'))
  })

  it('says clearing the text deletes the note, because that is what the server does', async () => {
    body = 'something'
    renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    expect(await screen.findByText(i18n.t('event:personal.note.clearHint'))).toBeInTheDocument()
  })

  it('sends the empty body that deletes the record when the text is cleared', async () => {
    body = 'something'
    const { user } = renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    const field = await screen.findByLabelText(i18n.t('event:personal.note.label'))
    await user.clear(field)
    field.blur()

    await waitFor(() => expect(save).toHaveBeenCalledWith(''))
  })

  it('reports that the save happened', async () => {
    const { user } = renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    const field = await screen.findByLabelText(i18n.t('event:personal.note.label'))
    await user.type(field, 'x')
    field.blur()

    expect(await screen.findByText(i18n.t('event:personal.note.saved'))).toBeInTheDocument()
  })

  it('says so when the save fails instead of pretending it worked', async () => {
    save.mockRejectedValue(new Error('offline'))
    const { user } = renderWithProviders(<NotePanel eventId="ev_gma9hq8a96q5" />)

    const field = await screen.findByLabelText(i18n.t('event:personal.note.label'))
    await user.type(field, 'x')
    field.blur()

    expect(await screen.findByText(i18n.t('event:personal.note.saveFailed'))).toBeInTheDocument()
    expect(screen.queryByText(i18n.t('event:personal.note.saved'))).not.toBeInTheDocument()
  })
})
