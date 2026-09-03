import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const INDEX = join(process.cwd(), 'index.html')
const NGINX = join(process.cwd(), '..', 'deploy', 'nginx.conf')

function inlineScript(): string {
  const html = readFileSync(INDEX, 'utf8')
  const match = html.match(/<script>([\s\S]*?)<\/script>/)
  if (!match?.[1]) throw new Error('the theme bootstrap script is gone from index.html')
  return match[1]
}

function digestOf(source: string): string {
  return `sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}`
}

describe('the theme bootstrap survives the production policy', () => {
  it('is still inline, because a separate file would load after the first paint', () => {
    expect(inlineScript()).toContain('prefers-color-scheme')
  })

  it('carries the digest nginx allows, so the policy does not silently block it', () => {
    const conf = readFileSync(NGINX, 'utf8')
    const digest = digestOf(inlineScript())

    expect(conf).toContain(digest)
  })

  it('allows that one script by digest rather than opening the door to any inline script', () => {
    const conf = readFileSync(NGINX, 'utf8')

    expect(conf).toContain("script-src 'self'")
    expect(conf).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  it('states the policy on every route that serves the page', () => {
    const conf = readFileSync(NGINX, 'utf8')
    const stated = conf.match(/Content-Security-Policy/g) ?? []
    const withDigest = conf.match(/sha256-/g) ?? []

    expect(withDigest.length).toBe(stated.length)
  })
})
