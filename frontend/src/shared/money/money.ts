const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
  INR: '₹',
  CNY: '¥',
  GBP: '£',
  JPY: '¥',
  KZT: '₸',
  UAH: '₴',
}

const SYMBOL_LEADS = new Set(['USD', 'GBP', 'CNY', 'JPY', 'INR'])

export function formatAmount(value: string): string | null {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return Math.round(amount).toLocaleString('en-US')
}

export function formatMoney(
  value: string | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (!value || !currency) return null
  const amount = formatAmount(value)
  if (amount === null) return null

  const code = currency.toUpperCase()
  const symbol = CURRENCY_SYMBOL[code]
  if (symbol === undefined) return `${amount} ${code}`
  return SYMBOL_LEADS.has(code) ? `${symbol}${amount}` : `${amount} ${symbol}`
}
