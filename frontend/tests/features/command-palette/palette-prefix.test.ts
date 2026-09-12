import { describe, expect, it } from 'vitest'
import { isHelpQuery, parseQuery } from '@/features/command-palette/palette-prefix'

describe('parseQuery', () => {
  it('reads the hackathon prefix', () => {
    expect(parseQuery('#hack')).toEqual({ mode: 'hackathons', prefix: '#', term: 'hack' })
  })

  it('reads the meetup prefix', () => {
    expect(parseQuery('@meet')).toEqual({ mode: 'meetups', prefix: '@', term: 'meet' })
  })

  it('reads the combined events prefix', () => {
    expect(parseQuery('*any')).toEqual({ mode: 'events', prefix: '*', term: 'any' })
  })

  it('reads the commands prefix', () => {
    expect(parseQuery('>side')).toEqual({ mode: 'commands', prefix: '>', term: 'side' })
  })

  it('reads the pages prefix', () => {
    expect(parseQuery('/sched')).toEqual({ mode: 'pages', prefix: '/', term: 'sched' })
  })

  it('reads the teams prefix', () => {
    expect(parseQuery('~goats')).toEqual({ mode: 'teams', prefix: '~', term: 'goats' })
  })

  it('reads the admin prefix', () => {
    expect(parseQuery('!users')).toEqual({ mode: 'admin', prefix: '!', term: 'users' })
  })

  it('falls back to a smart search with no prefix', () => {
    expect(parseQuery('timeline')).toEqual({ mode: 'smart', prefix: null, term: 'timeline' })
  })

  it('trims whitespace from the term', () => {
    expect(parseQuery('#  hack  ')).toEqual({ mode: 'hackathons', prefix: '#', term: 'hack' })
  })

  it('treats an empty string as smart mode with an empty term', () => {
    expect(parseQuery('')).toEqual({ mode: 'smart', prefix: null, term: '' })
  })
})

describe('isHelpQuery', () => {
  it('recognises a bare question mark', () => {
    expect(isHelpQuery('?')).toBe(true)
  })

  it('recognises a bare question mark with surrounding whitespace', () => {
    expect(isHelpQuery('  ? ')).toBe(true)
  })

  it('rejects a question mark attached to other text', () => {
    expect(isHelpQuery('?help')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isHelpQuery('')).toBe(false)
  })
})
