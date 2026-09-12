import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@tests/support/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarField } from '@/features/profile/avatar-field/avatar-field'

const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    error: (message: string) => toastError(message),
    success: (message: string) => toastSuccess(message),
  },
}))

vi.mock('@/entities/user/avatar.queries', () => ({
  useUploadAvatar: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveAvatar: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const SEED = '5f0d2b7a-0000-4000-8000-000000000001'

vi.stubGlobal('createImageBitmap', async () => ({ width: 64, height: 64, close: () => {} }))

function fileInput(): HTMLInputElement {
  const node = document.querySelector<HTMLInputElement>('input[type=file]')
  if (!node) throw new Error('no file input')
  return node
}

function png(name: string, size = 64): File {
  const file = new File([new Uint8Array(1)], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function select(node: HTMLInputElement, file: File) {
  Object.defineProperty(node, 'files', { value: [file], configurable: true })
  fireEvent.change(node)
}

function renderField() {
  return renderWithProviders(<AvatarField seed={SEED} firstName="Ivan" lastName="Petrov" />)
}

async function openUploadDialog() {
  const rendered = renderField()
  await rendered.user.click(screen.getByRole('button', { name: /Upload/i }))
  await screen.findByRole('alertdialog')
  return rendered
}

beforeEach(() => {
  toastError.mockClear()
  toastSuccess.mockClear()
})

describe('the upload control is a real file input, not a scripted click', () => {
  it('puts the file input inside its own label so the browser opens the picker', async () => {
    await openUploadDialog()
    const node = fileInput()

    expect(node.closest('label')).not.toBeNull()
    expect(node.disabled).toBe(false)
  })

  it('keeps the input reachable rather than collapsing it to nothing', async () => {
    await openUploadDialog()
    const node = fileInput()

    expect(node.className).toContain('sr-only')
    expect(node.getAttribute('aria-hidden')).toBeNull()
    expect(node.getAttribute('tabindex')).toBeNull()
  })

  it('clears the value after a choice so the same file can be picked twice', async () => {
    await openUploadDialog()
    const node = fileInput()

    select(node, png('avatar.png'))

    await waitFor(() => {
      expect(node.value).toBe('')
    })
  })
})

describe('a chosen file is checked before the editor opens', () => {
  it('opens the editor overlay for an accepted image', async () => {
    await openUploadDialog()
    select(fileInput(), png('avatar.png'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Image editor|editor/i })).toBeInTheDocument()
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('refuses a file the server would reject for its type, and says so', async () => {
    await openUploadDialog()
    const bad = new File([new Uint8Array(8)], 'notes.pdf', { type: 'application/pdf' })

    select(fileInput(), bad)

    await waitFor(() => expect(toastError).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('refuses a file past the 5 MB limit before it reaches the network', async () => {
    await openUploadDialog()
    const huge = png('huge.png', 5 * 1024 * 1024 + 1)

    select(fileInput(), huge)

    await waitFor(() => expect(toastError).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
