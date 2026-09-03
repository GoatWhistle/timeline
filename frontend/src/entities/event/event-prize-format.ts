import { currencySymbol } from './event-currency'

const SYMBOL_LEADS = new Set(['USD', 'GBP', 'CNY', 'JPY', 'INR'])

export function formatPrizeAmount(pool: string): string | null {
  const amount = Number(pool)
  if (!Number.isFinite(amount)) return null
  return Math.round(amount).toLocaleString('en-US')
}

export function formatPrize(
  pool: string | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (!pool || !currency) return null
  const amount = formatPrizeAmount(pool)
  if (amount === null) return null

  const code = currency.toUpperCase()
  const symbol = currencySymbol(code)
  if (symbol === null) return `${amount} ${code}`
  return SYMBOL_LEADS.has(code) ? `${symbol}${amount}` : `${amount} ${symbol}`
}
