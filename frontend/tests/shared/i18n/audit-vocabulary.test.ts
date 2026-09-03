import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUDIT_ACTIONS, ENTITY_TYPES } from '@/entities/audit/audit.labels'
import { LOCALES } from '@/shared/i18n/locale'

const SRC = join(process.cwd(), 'src')

function contractEnum(name: string): string[] {
  const schema = readFileSync(join(SRC, 'shared', 'api', 'schema.d.ts'), 'utf8')
  const line = schema.match(new RegExp(`"models.${name}":([^;]+);`))?.[1]
  if (!line) throw new Error(`the contract declares no models.${name}`)
  return [...line.matchAll(/"([A-Z_]+)"/g)].flatMap(([, value]) => (value ? [value] : []))
}

type AuditDictionary = {
  actionLabel: Record<string, string>
  entityType: Record<string, string>
}

function dictionary(locale: string): AuditDictionary {
  const file = join(SRC, 'shared', 'i18n', 'locales', locale, 'admin.json')
  return (JSON.parse(readFileSync(file, 'utf8')) as { audit: AuditDictionary }).audit
}

const ACTIONS = contractEnum('AuditAction')
const ENTITIES = contractEnum('EntityType')

describe('the audit log can name everything the backend records', () => {
  it('reads a non-empty vocabulary out of the contract', () => {
    expect(ACTIONS.length).toBeGreaterThan(20)
    expect(ENTITIES.length).toBeGreaterThan(5)
  })

  it.each(LOCALES)('%s names every action the contract can produce', (locale) => {
    const labels = dictionary(locale).actionLabel
    const missing = ACTIONS.filter((action) => typeof labels[action] !== 'string')
    expect(missing, `${locale} would print the raw key for these actions`).toEqual([])
  })

  it.each(LOCALES)('%s names every entity type the contract can produce', (locale) => {
    const labels = dictionary(locale).entityType
    const missing = ENTITIES.filter((entity) => typeof labels[entity] !== 'string')
    expect(missing, `${locale} would print the raw key for these entity types`).toEqual([])
  })

  it.each(LOCALES)('%s leaves no label empty', (locale) => {
    const audit = dictionary(locale)
    for (const group of ['actionLabel', 'entityType'] as const) {
      for (const [key, value] of Object.entries(audit[group] ?? {})) {
        expect(value.trim(), `${locale} ${group}.${key} is blank`).not.toBe('')
      }
    }
  })

  it('offers the operator every action the contract can produce as a filter', () => {
    const known = new Set<string>(AUDIT_ACTIONS)
    const missing = ACTIONS.filter((action) => !known.has(action))
    expect(missing, 'these actions can never be filtered for').toEqual([])
  })

  it('offers the operator every entity type the contract can produce as a filter', () => {
    const known = new Set<string>(ENTITY_TYPES)
    const missing = ENTITIES.filter((entity) => !known.has(entity))
    expect(missing, 'these entity types can never be filtered for').toEqual([])
  })

  it('offers no filter the contract cannot produce', () => {
    const actions = new Set<string>(ACTIONS)
    const entities = new Set<string>(ENTITIES)
    expect(AUDIT_ACTIONS.filter((action) => !actions.has(action))).toEqual([])
    expect(ENTITY_TYPES.filter((entity) => !entities.has(entity))).toEqual([])
  })
})
