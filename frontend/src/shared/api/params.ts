import type { paths } from './schema'

/**
 * Типы query-параметров, выведенные прямо из контракта. Ручное описание
 * расходится со спецификацией (например, enum состояний), поэтому параметры
 * берутся из сгенерированных типов, а не переписываются.
 */
export type QueryParams<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  parameters: { query?: infer Q }
}
  ? NonNullable<Q>
  : never

/** Тело запроса из контракта. */
export type RequestBody<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { 'application/json': infer B } }
}
  ? NonNullable<B>
  : never
