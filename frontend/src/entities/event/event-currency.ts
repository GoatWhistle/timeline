export type CurrencyOption = { code: string; symbol: string }

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'RUB', symbol: '₽' },
  { code: 'INR', symbol: '₹' },
  { code: 'CNY', symbol: '¥' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'KZT', symbol: '₸' },
  { code: 'UAH', symbol: '₴' },
]

export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)

export function currencySymbol(code: string): string | null {
  const found = CURRENCIES.find((currency) => currency.code === code.toUpperCase())
  return found ? found.symbol : null
}
