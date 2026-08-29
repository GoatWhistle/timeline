import { useEffect, useRef } from 'react'
import { useUpdateProfile } from '@/entities/user/profile.queries'
import { useSession } from '@/shared/api/session'
import { useLocale } from '@/shared/i18n/i18n-context'
import { isLocale } from '@/shared/i18n/locale'

export function useProfileLocale(): void {
  const { user } = useSession()
  const { locale, setLocale } = useLocale()
  const updateProfile = useUpdateProfile()
  const adopted = useRef(false)

  const profileLocale = user?.locale

  useEffect(() => {
    if (adopted.current || !isLocale(profileLocale)) return
    adopted.current = true
    if (profileLocale !== locale) setLocale(profileLocale)
  }, [profileLocale, locale, setLocale])

  useEffect(() => {
    if (!adopted.current || !isLocale(profileLocale) || profileLocale === locale) return
    updateProfile.mutate({ locale })
  }, [locale, profileLocale, updateProfile])
}
