import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

const spec = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/shared/api/openapi.gen.json'), 'utf8'),
) as Record<string, unknown>

const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true })
addFormats(ajv)
ajv.addSchema(spec, 'contract')

const pointer = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1')

const cache = new Map<string, ValidateFunction>()

export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

export function responseValidator(
  path: string,
  method: HttpMethod,
  status: number,
): ValidateFunction {
  const key = `${method} ${path} ${status}`
  const cached = cache.get(key)
  if (cached) return cached

  const ref = [
    'contract#/paths',
    pointer(path),
    method,
    'responses',
    status,
    'content',
    pointer('application/json'),
    'schema',
  ].join('/')

  const validate = ajv.compile({ $ref: ref })
  cache.set(key, validate)
  return validate
}

export function assertMatchesContract(
  path: string,
  method: HttpMethod,
  status: number,
  body: unknown,
): void {
  const validate = responseValidator(path, method, status)
  if (validate(body)) return

  const problems = (validate.errors ?? [])
    .map((error) => `  ${error.instancePath || '/'} ${error.message}`)
    .join('\n')
  throw new Error(
    `Response ${method.toUpperCase()} ${path} (${status}) does not match the contract:\n${problems}`,
  )
}
