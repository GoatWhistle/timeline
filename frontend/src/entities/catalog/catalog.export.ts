import { useMutation } from '@tanstack/react-query'
import type { AdminListParams } from '@/entities/event/event.queries'
import { BASE_URL } from '@/shared/api/client'
import type { CatalogParams } from './catalog.queries'

const EXPORT_FILENAME = 'catalog.csv'

export function exportSearch(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  search.delete('page')
  search.delete('page_size')
  return search.toString()
}

function filenameFrom(header: string | null): string {
  const match = header?.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? EXPORT_FILENAME
}

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export type ExportPath =
  | '/catalog/export'
  | '/admin/events/export'
  | '/admin/users/export'
  | '/admin/audit/export'

export async function downloadExport(
  path: ExportPath,
  params: Record<string, unknown>,
): Promise<void> {
  const search = exportSearch(params)
  const response = await fetch(`${BASE_URL}${path}${search === '' ? '' : `?${search}`}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/csv' },
  })
  if (!response.ok) {
    throw new Error(`export failed with status ${response.status}`)
  }
  const blob = await response.blob()
  save(blob, filenameFrom(response.headers.get('Content-Disposition')))
}

export function downloadCatalogExport(params: CatalogParams): Promise<void> {
  return downloadExport('/catalog/export', params)
}

export function useCatalogExport() {
  return useMutation<void, Error, CatalogParams>({
    mutationFn: (params) => downloadCatalogExport(params),
  })
}

export function useAdminEventsExport() {
  return useMutation<void, Error, AdminListParams>({
    mutationFn: (params) => downloadExport('/admin/events/export', params),
  })
}

export function useListExport<P extends object>(path: ExportPath) {
  return useMutation<void, Error, P>({
    mutationFn: (params) => downloadExport(path, params as Record<string, unknown>),
  })
}
