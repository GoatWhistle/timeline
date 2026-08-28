export class CookieJar {
  private readonly values = new Map<string, string>()

  absorb(setCookies: readonly string[]): void {
    for (const raw of setCookies) {
      const [pair, ...attributes] = raw.split(';')
      const separator = pair?.indexOf('=') ?? -1
      if (!pair || separator <= 0) continue

      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()

      const expired = attributes.some((attribute) => {
        const [key, amount] = attribute.split('=').map((part) => part.trim().toLowerCase())
        return key === 'max-age' && amount !== undefined && Number(amount) <= 0
      })

      if (value === '' || expired) {
        this.values.delete(name)
        continue
      }
      this.values.set(name, value)
    }
  }

  header(): string {
    return [...this.values].map(([name, value]) => `${name}=${value}`).join('; ')
  }

  drop(name: string): void {
    this.values.delete(name)
  }

  clear(): void {
    this.values.clear()
  }
}
