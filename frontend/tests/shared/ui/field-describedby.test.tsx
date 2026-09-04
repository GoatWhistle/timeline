import { renderWithProviders } from '@tests/support/render'
import { describe, expect, it } from 'vitest'
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'

describe('a field tells assistive technology what is wrong', () => {
  it('points the control at its error message', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" error="Too short">
        <Input id="nick" />
      </Field>,
    )
    const input = container.querySelector('#nick')
    expect(input?.getAttribute('aria-describedby')).toBe('nick-error')
    expect(input?.getAttribute('aria-invalid')).toBe('true')
    expect(container.querySelector('#nick-error')?.textContent).toBe('Too short')
  })

  it('points the control at its hint while nothing is wrong', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" hint="3 to 39 characters">
        <Input id="nick" />
      </Field>,
    )
    const input = container.querySelector('#nick')
    expect(input?.getAttribute('aria-describedby')).toBe('nick-hint')
    expect(input?.getAttribute('aria-invalid')).toBeNull()
  })

  it('prefers the error over the hint when both are present', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" hint="3 to 39 characters" error="Taken">
        <Input id="nick" />
      </Field>,
    )
    expect(container.querySelector('#nick')?.getAttribute('aria-describedby')).toBe('nick-error')
    expect(container.querySelector('#nick-hint')).toBeNull()
  })

  it('describes nothing when there is neither hint nor error', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick">
        <Input id="nick" />
      </Field>,
    )
    expect(container.querySelector('#nick')?.getAttribute('aria-describedby')).toBeNull()
  })

  it('leaves a control that wires its own description alone', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" error="Too short">
        <Input id="nick" aria-describedby="custom-help" />
      </Field>,
    )
    expect(container.querySelector('#nick')?.getAttribute('aria-describedby')).toBe('custom-help')
  })
})

describe('a field says out loud that it is required', () => {
  it('marks the control required, not only the label', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" required>
        <Input id="nick" />
      </Field>,
    )
    expect(container.querySelector('#nick')?.getAttribute('aria-required')).toBe('true')
  })

  it('spells the obligation out for a screen reader beside the asterisk', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" required>
        <Input id="nick" />
      </Field>,
    )
    const mark = container.querySelector('[data-required-mark]')
    expect(mark).not.toBeNull()
    expect(mark?.querySelector('[aria-hidden="true"]')?.textContent).toBe('*')
    const spoken = mark?.querySelector('.sr-only')?.textContent ?? ''
    expect(spoken.trim().length).toBeGreaterThan(1)
    expect(spoken).not.toBe('*')
  })

  it('says nothing about obligation when the field is optional', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick">
        <Input id="nick" />
      </Field>,
    )
    expect(container.querySelector('[data-required-mark]')).toBeNull()
    expect(container.querySelector('#nick')?.getAttribute('aria-required')).toBeNull()
  })

  it('leaves a control that states its own obligation alone', () => {
    const { container } = renderWithProviders(
      <Field label="Nickname" htmlFor="nick" required>
        <Input id="nick" aria-required={false} />
      </Field>,
    )
    expect(container.querySelector('#nick')?.getAttribute('aria-required')).toBe('false')
  })
})
