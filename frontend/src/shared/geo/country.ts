const CODE_PATTERN = /^[A-Za-z]{2}$/

let regionNames: Intl.DisplayNames | null | undefined

function names(): Intl.DisplayNames | null {
  if (regionNames !== undefined) return regionNames
  try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    regionNames = null
  }
  return regionNames
}

export function countryName(code: string | null | undefined): string | null {
  if (!code || !CODE_PATTERN.test(code)) return null
  const upper = code.toUpperCase()
  const resolver = names()
  if (!resolver) return upper
  try {
    const resolved = resolver.of(upper)
    return resolved && resolved !== upper ? resolved : upper
  } catch {
    return upper
  }
}

export function placeLine(
  city: string | null | undefined,
  countryCode: string | null | undefined,
): string | null {
  const trimmedCity = city?.trim() || null
  const country = countryName(countryCode)
  const parts = [trimmedCity, country].filter((part): part is string => part !== null)
  return parts.length === 0 ? null : parts.join(', ')
}
