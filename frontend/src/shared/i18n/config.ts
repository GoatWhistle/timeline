import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from './locale'
import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enErrors from './locales/en/errors.json'
import enEvent from './locales/en/event.json'
import enNotification from './locales/en/notification.json'
import enRegistration from './locales/en/registration.json'
import ruAuth from './locales/ru/auth.json'
import ruCommon from './locales/ru/common.json'
import ruErrors from './locales/ru/errors.json'
import ruEvent from './locales/ru/event.json'
import ruNotification from './locales/ru/notification.json'
import ruRegistration from './locales/ru/registration.json'

export const NAMESPACES = [
  'common',
  'event',
  'registration',
  'notification',
  'auth',
  'errors',
] as const

export const resources = {
  ru: {
    common: ruCommon,
    event: ruEvent,
    registration: ruRegistration,
    notification: ruNotification,
    auth: ruAuth,
    errors: ruErrors,
  },
  en: {
    common: enCommon,
    event: enEvent,
    registration: enRegistration,
    notification: enNotification,
    auth: enAuth,
    errors: enErrors,
  },
} as const

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: resolveLocale(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: LOCALES,
    defaultNS: 'common',
    ns: NAMESPACES,
    interpolation: { escapeValue: false },
    returnNull: false,
  })
}

export { i18n }
