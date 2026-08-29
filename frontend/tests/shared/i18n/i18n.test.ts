import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { i18n, resources } from '@/shared/i18n/config'
import { LOCALES } from '@/shared/i18n/locale'

type Tree = { [key: string]: string | Tree }

function keyPaths(tree: Tree, prefix = ''): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push(path)
    else out.push(...keyPaths(value, path))
  }
  return out
}

function leaves(tree: Tree, prefix = ''): [string, string][] {
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push([path, value])
    else out.push(...leaves(value, path))
  }
  return out
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function pluralBase(path: string): string {
  return path.replace(PLURAL_SUFFIX, '')
}

afterAll(async () => {
  await i18n.changeLanguage('ru')
})

describe('i18n dictionaries', () => {
  it('cover the same keys in both languages', () => {
    for (const ns of Object.keys(resources.ru) as (keyof typeof resources.ru)[]) {
      const ru = new Set(keyPaths(resources.ru[ns] as Tree).map(pluralBase))
      const en = new Set(keyPaths(resources.en[ns] as Tree).map(pluralBase))
      expect([...ru].sort(), `namespace ${ns}`).toEqual([...en].sort())
    }
  })

  it('leave no message empty', () => {
    for (const locale of LOCALES) {
      for (const ns of Object.keys(resources[locale])) {
        const tree = resources[locale][ns as keyof (typeof resources)[typeof locale]] as Tree
        for (const [path, value] of leaves(tree)) {
          expect(value, `${locale}/${ns}:${path}`).not.toHaveLength(0)
        }
      }
    }
  })
})

describe('russian plurals', () => {
  it('render three distinct forms', async () => {
    await i18n.changeLanguage('ru')
    const t = i18n.getFixedT('ru', 'registration')

    expect(t('participants.selected', { count: 1 })).toBe('Выбран 1 участник')
    expect(t('participants.selected', { count: 2 })).toBe('Выбрано 2 участника')
    expect(t('participants.selected', { count: 5 })).toBe('Выбрано 5 участников')
    expect(t('participants.selected', { count: 21 })).toBe('Выбран 21 участник')
  })

  it('use two forms in english', async () => {
    await i18n.changeLanguage('en')
    const t = i18n.getFixedT('en', 'registration')

    expect(t('participants.selected', { count: 1 })).toBe('1 participant selected')
    expect(t('participants.selected', { count: 5 })).toBe('5 participants selected')
  })
})

describe('locale switching', () => {
  it('resolves domain labels in both languages', async () => {
    await i18n.changeLanguage('ru')
    expect(i18n.t('event:state.ACTIVE')).toBe('Идёт')

    await i18n.changeLanguage('en')
    expect(i18n.t('event:state.ACTIVE')).toBe('Active')
  })
})

const SOURCE_ROOT = resolve(process.cwd(), 'src')
const PLURAL_SUFFIXES = ['', '_zero', '_one', '_two', '_few', '_many', '_other']
const CALL = /\bt\(\s*'([^']+)'/g
const NAMESPACE = /useTranslation\(\s*'([a-z]+)'\s*\)/
const TITLE_KEY = /titleKey:\s*'([^']+)'/g

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.gen.ts')) out.push(full)
  }
  return out
}

function resolves(locale: 'ru' | 'en', namespace: string, key: string): boolean {
  const tree = (resources[locale] as Record<string, Tree>)[namespace]
  if (!tree) return false
  return PLURAL_SUFFIXES.some((suffix) => {
    const node = (key + suffix)
      .split('.')
      .reduce<string | Tree | undefined>(
        (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
        tree,
      )
    return typeof node === 'string'
  })
}

function referencedKeys(): { key: string; namespace: string; file: string }[] {
  const found: { key: string; namespace: string; file: string }[] = []
  for (const file of sourceFiles(SOURCE_ROOT)) {
    const source = readFileSync(file, 'utf8')
    const fallback = NAMESPACE.exec(source)?.[1] ?? 'common'
    const raw = [...source.matchAll(CALL), ...source.matchAll(TITLE_KEY)].map((match) => match[1])
    for (const literal of raw) {
      if (literal === undefined || literal.includes('${') || literal.includes('{{')) continue
      const [head, tail] = literal.includes(':') ? literal.split(':') : [fallback, literal]
      if (head === undefined || tail === undefined) continue
      found.push({ namespace: head, key: tail, file })
    }
  }
  return found
}

describe('every key the code asks for exists', () => {
  it('finds a large number of translation calls to check', () => {
    expect(referencedKeys().length).toBeGreaterThan(200)
  })

  it('resolves in both languages', () => {
    const unresolved: string[] = []
    for (const { namespace, key, file } of referencedKeys()) {
      for (const locale of LOCALES) {
        if (!resolves(locale, namespace, key)) {
          unresolved.push(`${locale} ${namespace}:${key} (${file})`)
        }
      }
    }
    expect([...new Set(unresolved)]).toEqual([])
  })
})
