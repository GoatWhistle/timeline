import { renderWithProviders } from '@tests/support/render'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { i18n } from '@/shared/i18n/config'
import { MoneyInput } from '@/shared/ui/forms/money-input'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <MoneyInput id="prize" value={value} onChange={setValue} />
}

function field(): HTMLInputElement {
  const input = document.getElementById('prize')
  if (!(input instanceof HTMLInputElement)) throw new Error('no money field')
  return input
}

const initialLanguage = i18n.language

afterEach(async () => {
  await i18n.changeLanguage(initialLanguage)
})

describe('digits are grouped as they are typed', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('groups thousands with the English separator while typing', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('1234567')
    expect(field().value).toBe('1,234,567')
    expect(field()).toHaveAttribute('data-value', '1234567')
  })

  it('never lets a non-digit character reach the value', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('15a00.50b')
    expect(field()).toHaveAttribute('data-value', '150050')
  })

  it('drops leading zeros as more digits arrive', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('007')
    expect(field().value).toBe('7')
    expect(field()).toHaveAttribute('data-value', '7')
  })
})

describe('digits are grouped with the Russian separator when the locale is Russian', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru')
  })

  it('groups with the Russian thousands separator, not a comma', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.keyboard('1234567')
    expect(field().value).not.toContain(',')
    expect(field().value.replace(/\s/g, '')).toBe('1234567')
  })
})

describe('the caret follows the digit it sits next to, not a fixed offset', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('keeps the caret beside the digit just typed in the middle of a grouped number', async () => {
    const { user } = renderWithProviders(<Harness initial="123456" />)
    field().setSelectionRange(2, 2)
    field().focus()
    await user.keyboard('9')
    expect(field().value).toBe('1,293,456')
    expect(field().selectionStart).toBe(4)
  })

  it('treats a backspace over a bare separator as deleting the digit beside it, not nothing', async () => {
    const { user } = renderWithProviders(<Harness initial="1234" />)
    expect(field().value).toBe('1,234')
    const caretAfterComma = field().value.indexOf(',') + 1
    field().setSelectionRange(caretAfterComma, caretAfterComma)
    field().focus()
    await user.keyboard('{Backspace}')
    expect(field()).toHaveAttribute('data-value', '234')
  })

  it('places the caret after the pasted digits land in their grouped position', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.paste('1234567')
    expect(field().value).toBe('1,234,567')
    expect(field()).toHaveAttribute('data-value', '1234567')
  })

  it('normalises a paste that already carries its own thousands separators', async () => {
    const { user } = renderWithProviders(<Harness />)
    await user.click(field())
    await user.paste('1 234 567')
    expect(field().value).toBe('1,234,567')
  })
})

function ControlledHarness({ value }: { value: string }) {
  return <MoneyInput id="prize" value={value} onChange={() => {}} />
}

describe('the displayed shape stays correct when the value changes from outside', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('regroups the displayed digits when the stored value is replaced externally', () => {
    const { rerender } = renderWithProviders(<ControlledHarness value="1234567" />)
    expect(field().value).toBe('1,234,567')

    rerender(<ControlledHarness value="7654321" />)

    expect(field().value).toBe('7,654,321')
    expect(field()).toHaveAttribute('data-value', '7654321')
  })

  it('clears the field when the stored value is reset to empty', () => {
    const { rerender } = renderWithProviders(<ControlledHarness value="1234567" />)

    rerender(<ControlledHarness value="" />)

    expect(field().value).toBe('')
    expect(field()).not.toHaveAttribute('data-value')
  })
})
