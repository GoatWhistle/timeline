import { Navigate } from 'react-router'
import { DEFAULT_SECTION, SETTINGS_PARAM } from '@/features/settings-overlay/sections'

export function SettingsPage() {
  return <Navigate to={`/?${SETTINGS_PARAM}=${DEFAULT_SECTION}`} replace />
}
