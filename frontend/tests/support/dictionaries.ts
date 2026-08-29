import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BUNDLES, NAMESPACES, type Namespace } from '@/shared/i18n/config'
import { LOCALES, type Locale } from '@/shared/i18n/locale'

export type Tree = { [key: string]: string | Tree }

const LOCALES_ROOT = resolve(process.cwd(), 'src/shared/i18n/locales')

function readFile(locale: Locale, file: string): Tree {
  return JSON.parse(readFileSync(resolve(LOCALES_ROOT, locale, `${file}.json`), 'utf8')) as Tree
}

function readNamespace(locale: Locale, namespace: Namespace): Tree {
  const merged: Tree = {}
  for (const file of BUNDLES[namespace]) Object.assign(merged, readFile(locale, file))
  return merged
}

function readLocale(locale: Locale): Record<Namespace, Tree> {
  const out = {} as Record<Namespace, Tree>
  for (const namespace of NAMESPACES) out[namespace] = readNamespace(locale, namespace)
  return out
}

export const dictionaries: Record<Locale, Record<Namespace, Tree>> = {
  ru: readLocale('ru'),
  en: readLocale('en'),
}

function listFiles(locale: Locale): string[] {
  return readdirSync(resolve(LOCALES_ROOT, locale))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort()
}

export const dictionaryFiles: Record<Locale, string[]> = {
  ru: listFiles('ru'),
  en: listFiles('en'),
}

export const declaredFiles: string[] = NAMESPACES.flatMap((namespace) => [
  ...BUNDLES[namespace],
]).sort()

export function leaves(tree: Tree, prefix = ''): [string, string][] {
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.push([path, value])
    else out.push(...leaves(value, path))
  }
  return out
}

export function keyPaths(tree: Tree, prefix = ''): string[] {
  return leaves(tree, prefix).map(([path]) => path)
}

export { LOCALES, NAMESPACES }

export function text(locale: Locale, namespace: Namespace, path: string): string {
  const node = path
    .split('.')
    .reduce<string | Tree | undefined>(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
      dictionaries[locale][namespace],
    )
  if (typeof node !== 'string') throw new Error(`missing ${locale}/${namespace}:${path}`)
  return node
}

export function branch(locale: Locale, namespace: Namespace, path: string): Tree {
  const node = path
    .split('.')
    .reduce<string | Tree | undefined>(
      (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
      dictionaries[locale][namespace],
    )
  if (!node || typeof node === 'string') throw new Error(`missing ${locale}/${namespace}:${path}`)
  return node
}
