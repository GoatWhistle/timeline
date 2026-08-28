const QWERTY = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`"
const JCUKEN = 'йцукенгшщзхъфывапролджэячсмитьбюё'

const LATIN_TO_CYRILLIC = new Map<string, string>()
const CYRILLIC_TO_LATIN = new Map<string, string>()

for (let index = 0; index < QWERTY.length; index += 1) {
  const latin = QWERTY[index]
  const cyrillic = JCUKEN[index]
  if (!latin || !cyrillic) continue
  LATIN_TO_CYRILLIC.set(latin, cyrillic)
  CYRILLIC_TO_LATIN.set(cyrillic, latin)
}

export function normalizeForSearch(value: string): string {
  return value.toLocaleLowerCase('ru').trim()
}

export function toCyrillicLayout(value: string): string {
  return normalizeForSearch(value)
    .split('')
    .map((character) => LATIN_TO_CYRILLIC.get(character) ?? character)
    .join('')
}

export function toLatinLayout(value: string): string {
  return normalizeForSearch(value)
    .split('')
    .map((character) => CYRILLIC_TO_LATIN.get(character) ?? character)
    .join('')
}

export function searchVariants(query: string): string[] {
  const base = normalizeForSearch(query)
  if (!base) return []
  const variants = new Set([base, toCyrillicLayout(base), toLatinLayout(base)])
  return [...variants].filter(Boolean)
}

export function matchesQuery(haystack: string, query: string): boolean {
  const target = normalizeForSearch(haystack)
  if (!target) return false
  return searchVariants(query).some((variant) => target.includes(variant))
}
