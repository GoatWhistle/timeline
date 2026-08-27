import type { paths } from './schema'

export type QueryParams<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  parameters: { query?: infer Q }
}
  ? NonNullable<Q>
  : never

export type RequestBody<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { 'application/json': infer B } }
}
  ? NonNullable<B>
  : never
