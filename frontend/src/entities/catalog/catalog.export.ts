import { useMutation } from '@tanstack/react-query'
import { BASE_URL } from '@/shared/api/client'
import type { CatalogParams } from './catalog.queries'

const EXPORT_FILENAME = 'catalog.csv'

export function exportSearch(params: CatalogParams): string {
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
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function downloadCatalogExport(params: CatalogParams): Promise<void> {
  const search = exportSearch(params)
  const response = await fetch(`${BASE_URL}/catalog/export${search === '' ? '' : `?${search}`}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/csv' },
  })
  if (!response.ok) {
    throw new Error(`catalog export failed with status ${response.status}`)
  }
  const blob = await response.blob()
  save(blob, filenameFrom(response.headers.get('Content-Disposition')))
}

export function useCatalogExport() {
  return useMutation<void, Error, CatalogParams>({
    mutationFn: (params) => downloadCatalogExport(params),
  })
}
