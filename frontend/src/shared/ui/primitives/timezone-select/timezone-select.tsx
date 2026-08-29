import { useTranslation } from 'react-i18next'
import { browserTimeZone, isTimeZone, SYSTEM_TIME_ZONE } from '@/shared/datetime/datetime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/forms/select'

const COMMON_ZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Lisbon',
  'Europe/Belgrade',
  'Asia/Yerevan',
  'Asia/Tbilisi',
  'Asia/Almaty',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'UTC',
]

function offsetLabel(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

function zoneOptions(current: string | null | undefined): string[] {
  const zones = new Set(COMMON_ZONES)
  const detected = browserTimeZone()
  if (isTimeZone(detected)) zones.add(detected)
  if (isTimeZone(current)) zones.add(current)
  zones.add(SYSTEM_TIME_ZONE)
  return [...zones].sort((a, b) => a.localeCompare(b))
}

export function TimezoneSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const options = zoneOptions(value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={t('timezone.legend')} className="w-64">
        <SelectValue placeholder={t('timezone.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((zone) => (
          <SelectItem key={zone} value={zone}>
            {zone.replace(/_/g, ' ')} ({offsetLabel(zone)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
