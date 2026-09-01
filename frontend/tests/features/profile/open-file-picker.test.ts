import { describe, expect, it, vi } from 'vitest'
import { openFilePicker } from '@/features/profile/avatar-field/open-file-picker'

function input(): HTMLInputElement {
  const node = document.createElement('input')
  node.type = 'file'
  return node
}

describe('opening the file picker', () => {
  it('prefers showPicker, which survives a clipped input inside a dialog', () => {
    const node = input()
    const showPicker = vi.fn()
    Object.defineProperty(node, 'showPicker', { value: showPicker, configurable: true })
    const click = vi.spyOn(node, 'click')

    expect(openFilePicker(node)).toBe(true)
    expect(showPicker).toHaveBeenCalledOnce()
    expect(click).not.toHaveBeenCalled()
  })

  it('falls back to click when the browser has no showPicker', () => {
    const node = input()
    Object.defineProperty(node, 'showPicker', { value: undefined, configurable: true })
    const click = vi.spyOn(node, 'click').mockImplementation(() => {})

    expect(openFilePicker(node)).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('falls back to click when showPicker throws for a reason other than security', () => {
    const node = input()
    Object.defineProperty(node, 'showPicker', {
      value: () => {
        throw new DOMException('not allowed', 'NotAllowedError')
      },
      configurable: true,
    })
    const click = vi.spyOn(node, 'click').mockImplementation(() => {})

    expect(openFilePicker(node)).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('reports failure instead of silently doing nothing when the gesture is refused', () => {
    const node = input()
    Object.defineProperty(node, 'showPicker', {
      value: () => {
        throw new DOMException('gesture required', 'SecurityError')
      },
      configurable: true,
    })
    const click = vi.spyOn(node, 'click')

    expect(openFilePicker(node)).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('reports failure for a disabled input rather than pretending it opened', () => {
    const node = input()
    node.disabled = true
    expect(openFilePicker(node)).toBe(false)
  })
})
