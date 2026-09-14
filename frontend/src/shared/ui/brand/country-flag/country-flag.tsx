import { countryName } from '@/shared/geo/country'
import { flagSource } from '@/shared/geo/flag'
import { cn } from '@/shared/styling/class-names/class-names'

export function CountryFlag({
  code,
  className,
}: {
  code: string | null | undefined
  className?: string
}) {
  const source = flagSource(code)
  if (!source) return null

  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      data-country-flag={code?.toLowerCase()}
      title={countryName(code) ?? undefined}
      className={cn(
        'h-3 w-4 shrink-0 rounded-[0.125rem] border border-border/60 object-cover',
        className,
      )}
    />
  )
}
