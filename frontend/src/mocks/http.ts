import { HttpResponse } from 'msw'
import type { FieldError } from '@/shared/api/types.gen'

export const API = '*/api/v1'

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: FieldError[],
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
        request_id: crypto.randomUUID(),
      },
    },
    { status },
  )
}

export const unauthenticated = () =>
  errorResponse(401, 'unauthenticated', 'Требуется вход в систему')

export const forbidden = () => errorResponse(403, 'forbidden', 'Недостаточно прав')

export const notFound = () => errorResponse(404, 'not_found', 'Объект не найден')

export function paginate<T>(items: T[], url: URL) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(url.searchParams.get('page_size') ?? '50', 10) || 50),
  )
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    meta: {
      page,
      page_size: pageSize,
      total: items.length,
      has_next: start + pageSize < items.length,
    },
  }
}
