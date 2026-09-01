import { describe, expect, it } from 'vitest'
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  rejectionFor,
} from '@/features/profile/avatar-field/avatar-file'

function fake(type: string, size: number): File {
  const file = new File([new Uint8Array(1)], 'a', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('the accept list matches what the server keeps', () => {
  it('offers exactly PNG, JPEG and WebP to the operating system dialog', () => {
    expect(AVATAR_ACCEPT).toBe('image/png,image/jpeg,image/webp')
  })

  it('matches the server limit of 2 MB', () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024)
  })
})

describe('rejecting a file before it reaches the network', () => {
  it('accepts each supported image type', () => {
    expect(rejectionFor(fake('image/png', 10))).toBeNull()
    expect(rejectionFor(fake('image/jpeg', 10))).toBeNull()
    expect(rejectionFor(fake('image/webp', 10))).toBeNull()
  })

  it('accepts a type the dialog reported in mixed case', () => {
    expect(rejectionFor(fake('IMAGE/PNG', 10))).toBeNull()
  })

  it('accepts a file whose type the operating system could not name', () => {
    expect(rejectionFor(fake('', 10))).toBeNull()
  })

  it('rejects a type the server would refuse', () => {
    expect(rejectionFor(fake('application/pdf', 10))).toBe('type')
    expect(rejectionFor(fake('image/gif', 10))).toBe('type')
    expect(rejectionFor(fake('image/svg+xml', 10))).toBe('type')
  })

  it('rejects a file past the limit, and reports size rather than type', () => {
    expect(rejectionFor(fake('image/png', AVATAR_MAX_BYTES + 1))).toBe('size')
  })

  it('accepts a file exactly on the limit', () => {
    expect(rejectionFor(fake('image/png', AVATAR_MAX_BYTES))).toBeNull()
  })
})
