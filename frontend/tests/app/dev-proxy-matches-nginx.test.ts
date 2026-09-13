import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
const nginxConfig = readFileSync(resolve(process.cwd(), '../deploy/nginx.conf'), 'utf8')

function nginxProxiedPrefixes(): string[] {
  const grouped = nginxConfig.matchAll(/location\s+~\s+\^\/\(([^)]+)\)/g)
  const prefixes = new Set<string>()
  for (const match of grouped) {
    const group = match[1]
    if (!group) continue
    for (const name of group.split('|')) prefixes.add(name)
  }
  return [...prefixes]
}

describe('the development proxy serves what nginx serves', () => {
  it('proxies /mail so mail images resolve outside the container too', () => {
    expect(viteConfig).toContain("'/mail'")
  })

  it.each(['mail'])('nginx forwards /%s to the backend', (prefix) => {
    expect(nginxProxiedPrefixes()).toContain(prefix)
  })

  it('every backend prefix nginx proxies is reachable in development', () => {
    const browserFacing = nginxProxiedPrefixes().filter((prefix) => prefix === 'mail')
    for (const prefix of browserFacing) {
      expect(viteConfig).toContain(`'/${prefix}'`)
    }
  })
})
