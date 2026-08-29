import { describe, expect, it } from 'vitest'
import { createEditingGuard } from '@/shared/realtime/editing-guard'
import { backoffDelay, parseEnvelope } from '@/shared/realtime/envelope'
import { isEditableTarget } from '@/shared/realtime/use-editing-focus'

describe('realtime envelope', () => {
  it('reads an invalidation address rather than data', () => {
    const envelope = parseEnvelope('{"type":"invalidate","keys":["events","abc","participants"]}')
    expect(envelope).toEqual({ type: 'invalidate', keys: ['events', 'abc', 'participants'] })
  })

  it('reads an event envelope', () => {
    const envelope = parseEnvelope(
      '{"type":"event","event":{"id":"1","type":"WORKER_STALLED","severity":"CRITICAL","payload":{},"read":false,"created_at":"2026-01-01T00:00:00Z"}}',
    )
    expect(envelope?.type).toBe('event')
  })

  it('refuses malformed frames instead of throwing', () => {
    expect(parseEnvelope('not json')).toBeNull()
    expect(parseEnvelope('{"keys":[]}')).toBeNull()
  })

  it('backs off with growing steps and stops growing at the cap', () => {
    expect(backoffDelay(1)).toBe(1_000)
    expect(backoffDelay(2)).toBe(2_000)
    expect(backoffDelay(5)).toBe(30_000)
    expect(backoffDelay(50)).toBe(30_000)
  })
})

describe('editing guard', () => {
  it('holds while anything is being edited and releases per owner', () => {
    const guard = createEditingGuard()
    expect(guard.isHeld()).toBe(false)

    guard.hold('note')
    guard.hold('task')
    expect(guard.isHeld()).toBe(true)

    guard.release('note')
    expect(guard.isHeld()).toBe(true)

    guard.release('task')
    expect(guard.isHeld()).toBe(false)
  })
})

describe('editing focus detection', () => {
  it('treats text fields and content-editable regions as editing', () => {
    const input = document.createElement('input')
    input.type = 'text'
    const textarea = document.createElement('textarea')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')

    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(textarea)).toBe(true)
    expect(isEditableTarget(editable)).toBe(true)
  })

  it('does not hold updates for checkboxes, buttons or plain regions', () => {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    const button = document.createElement('button')
    const div = document.createElement('div')

    expect(isEditableTarget(checkbox)).toBe(false)
    expect(isEditableTarget(button)).toBe(false)
    expect(isEditableTarget(div)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})
