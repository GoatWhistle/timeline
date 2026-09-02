import type { Locale } from '@/shared/i18n/locale'

export type FlagPath = { fill: string; d: string }

export const FLAG_VIEW_BOX = '0 0 640 480'

export const LOCALE_FLAG: Record<Locale, FlagPath[]> = {
  ru: [
    { fill: '#fff', d: 'M0 0h640v160H0z' },
    { fill: '#0039a6', d: 'M0 160h640v160H0z' },
    { fill: '#d52b1e', d: 'M0 320h640v160H0z' },
  ],
  en: [
    { fill: '#012169', d: 'M0 0h640v480H0z' },
    {
      fill: '#fff',
      d: 'm75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z',
    },
    {
      fill: '#c8102e',
      d: 'm424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z',
    },
    { fill: '#fff', d: 'M241 0v480h160V0zM0 160v160h640V160z' },
    { fill: '#c8102e', d: 'M0 193v96h640v-96zM273 0v480h96V0z' },
  ],
}
