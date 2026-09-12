import { useMutation } from '@tanstack/react-query'
import { BASE_URL } from '@/shared/api/client'

const EXPORT_FILENAME = 'finance.csv'

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

export async function downloadFinanceExport(eventId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}/finance/export`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/csv' },
  })
  if (!response.ok) {
    throw new Error(`finance export failed with status ${response.status}`)
  }
  const blob = await response.blob()
  save(blob, filenameFrom(response.headers.get('Content-Disposition')))
}

export function useFinanceExport() {
  return useMutation<void, Error, string>({
    mutationFn: (eventId) => downloadFinanceExport(eventId),
  })
}
