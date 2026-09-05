import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Srgb } from '@/styles/oklch'
import { loadTheme, resolve, resolveRaw } from '@/styles/read-tokens'

const FAVICON = resolvePath(process.cwd(), 'public/favicon.svg')
const WORDMARK_LIGHT = resolvePath(process.cwd(), '../docs/brand/wordmark-light.svg')
const WORDMARK_DARK = resolvePath(process.cwd(), '../docs/brand/wordmark-dark.svg')

function toHex(colour: Srgb): string {
  return `#${colour
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function logoHex(theme: 'light' | 'dark'): string {
  return toHex(resolve(loadTheme(theme), '--logo'))
}

function trackOpacity(theme: 'light' | 'dark'): number {
  return Number(resolveRaw(loadTheme(theme), '--logo-track-opacity'))
}

function hexesIn(source: string): string[] {
  return [...source.matchAll(/#[0-9a-f]{6}\b/gi)].map((match) => match[0].toLowerCase())
}

function opacitiesIn(source: string): number[] {
  return [...source.matchAll(/opacity(?:="|: )([\d.]+)/g)].map((match) => Number(match[1]))
}

function inkHex(theme: 'light' | 'dark'): string {
  return toHex(resolve(loadTheme(theme), '--foreground'))
}

describe('the baked brand assets carry the colour the tokens declare', () => {
  it('the light wordmark paints the mark in the light --logo, not a colour of its own', () => {
    const used = [...new Set(hexesIn(readFileSync(WORDMARK_LIGHT, 'utf8')))].sort()
    expect(used).toEqual([logoHex('light'), inkHex('light')].sort())
  })

  it('the dark wordmark paints the mark in the dark --logo', () => {
    const used = [...new Set(hexesIn(readFileSync(WORDMARK_DARK, 'utf8')))].sort()
    expect(used).toEqual([logoHex('dark'), inkHex('dark')].sort())
  })

  it('the favicon carries both themes, each in its own --logo', () => {
    const source = readFileSync(FAVICON, 'utf8')
    expect([...new Set(hexesIn(source))].sort()).toEqual([logoHex('light'), logoHex('dark')].sort())
  })
})

describe('the baked brand assets fade the track by the amount the tokens declare', () => {
  it('the light wordmark fades its track by the light --logo-track-opacity', () => {
    expect([...new Set(opacitiesIn(readFileSync(WORDMARK_LIGHT, 'utf8')))]).toEqual([
      trackOpacity('light'),
    ])
  })

  it('the dark wordmark fades its track by the dark --logo-track-opacity', () => {
    expect([...new Set(opacitiesIn(readFileSync(WORDMARK_DARK, 'utf8')))]).toEqual([
      trackOpacity('dark'),
    ])
  })

  it('the favicon fades each theme by that theme own --logo-track-opacity', () => {
    expect(opacitiesIn(readFileSync(FAVICON, 'utf8'))).toEqual([
      trackOpacity('light'),
      trackOpacity('dark'),
    ])
  })
})
