import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'
import converter from 'swagger2openapi'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const SOURCE = resolve(root, '../docs/swagger.json')
const OUT_SCHEMA = resolve(root, 'src/shared/api/schema.d.ts')
const OUT_ALIASES = resolve(root, 'src/shared/api/types.gen.ts')
const OUT_SPEC = resolve(root, 'src/shared/api/openapi.gen.json')

/**
 * Поля, которые по ТЗ действительно могут отсутствовать в ответе.
 * Всё остальное считается обязательным: контракт не проставляет `required`,
 * из-за чего без этой правки каждое поле стало бы optional.
 */
const OPTIONAL = {
  'models.AuditResponse': ['actor_user_id', 'actor_email', 'before', 'after'],
  'models.BatchItemResult': ['id', 'key', 'code', 'message'],
  'models.DeadlineItem': ['overdue_minutes'],
  'models.ErrorBody': ['fields'],
  'models.EventCard': ['next_stage', 'registration', 'registration_status', 'team_role'],
  'models.EventResponse': [
    'description',
    'organizer',
    'website_url',
    'notes',
    'published_at',
    'archived_at',
  ],
  'models.InvitePreview': ['email', 'expires_at'],
  'models.InviteResponse': ['accepted_at', 'revoked_at'],
  'models.MeResponse': ['pending_email', 'telegram_username', 'preferred_channel'],
  'models.MyEventItem': [
    'organizer',
    'next_stage',
    'registration_deadline',
    'registration_status',
    'registration_url',
  ],
  'models.NotificationRuleResponse': ['channel_override'],
  'models.ParticipantResponse': ['removed_at', 'registration_status'],
  'models.RegistrationPublic': ['description', 'deadline_at'],
  'models.RegistrationResponse': ['description', 'deadline_at'],
  'models.RegistrationStatusResponse': ['last_changed_by_user_id', 'note', 'registered_at'],
  'models.RegistrationStatusShort': ['note', 'registered_at'],
  'models.StageResponse': ['description', 'url'],
  'models.TimelineRow': ['registration_deadline', 'team_role'],
  'models.WorkerHeartbeatResponse': ['scheduler_last_run_at', 'worker_last_run_at'],
}

/** Имена полей, которые по соглашениям API являются моментом времени RFC 3339. */
const DATE_TIME_FIELDS = new Set(['time', 'from', 'to', 'registration_deadline'])
const isDateTime = (name) => name.endsWith('_at') || DATE_TIME_FIELDS.has(name)

function patchSchema(name, schema) {
  const props = schema.properties
  if (!props) return { required: 0, dates: 0, enums: 0 }

  let dates = 0
  let enums = 0

  for (const [prop, value] of Object.entries(props)) {
    // Контракт не размечает время: без format клиент получает голую строку.
    if (isDateTime(prop) && value.type === 'string' && !value.format) {
      value.format = 'date-time'
      dates += 1
    }
    // swaggo дублирует enum рядом с $ref; сворачиваем в чистую ссылку,
    // иначе openapi-typescript выдаёт пересечение типов вместо объединения.
    if (Array.isArray(value.allOf) && value.allOf.length === 1 && value.allOf[0].$ref) {
      const ref = value.allOf[0].$ref
      const description = value.description
      for (const key of Object.keys(value)) delete value[key]
      value.$ref = ref
      if (description) value.description = description
      enums += 1
    }
  }

  // Тела запросов остаются частичными: PATCH по смыслу присылает подмножество полей.
  if (name.endsWith('Request') || schema.required) return { required: 0, dates, enums }

  const optional = new Set(OPTIONAL[name] ?? [])
  const required = Object.keys(props).filter((p) => !optional.has(p))
  if (required.length > 0) schema.required = required

  return { required: required.length, dates, enums }
}

const source = await import(`file://${SOURCE}`, { with: { type: 'json' } }).then((m) => m.default)

const { openapi } = await converter.convertObj(source, {
  patch: true,
  warnOnly: true,
  targetVersion: '3.0.3',
})

const schemas = openapi.components?.schemas ?? {}
const totals = { required: 0, dates: 0, enums: 0, patched: 0 }
for (const [name, schema] of Object.entries(schemas)) {
  const r = patchSchema(name, schema)
  totals.required += r.required
  totals.dates += r.dates
  totals.enums += r.enums
  if (r.required || r.dates || r.enums) totals.patched += 1
}

const ast = await openapiTS(openapi, { alphabetize: true, emptyObjectsUnknown: true })
const banner = [
  '/**',
  ' * GENERATED FILE - do not edit by hand.',
  ' * Source: docs/swagger.json. Regenerate: npm run api:types',
  ' */',
  '',
].join('\n')

const CHECK_ONLY = process.argv.includes('--check')
const outputs = []

const schemaContent = banner + astToString(ast)
outputs.push([OUT_SCHEMA, schemaContent])

// Псевдонимы без префикса `models.`: components['schemas']['models.MeResponse'] → MeResponse.
const aliases = Object.keys(schemas)
  .filter((name) => name.startsWith('models.'))
  .map((name) => [name.slice('models.'.length), name])
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([alias, name]) => `export type ${alias} = Schemas['${name}']`)

outputs.push([
  OUT_ALIASES,
  [
    banner.trimEnd(),
    "import type { components } from './schema'",
    '',
    "export type Schemas = components['schemas']",
    '',
    ...aliases,
    '',
  ].join('\n'),
])

openapi['x-generated-by'] = 'frontend/scripts/generate-api-types.mjs — не редактировать вручную'
outputs.push([OUT_SPEC, `${JSON.stringify(openapi, null, 2)}\n`])

// --check не пишет файлы, а сравнивает: так CI ловит контракт, изменённый
// backend-ом без перегенерации типов фронтенда.
if (CHECK_ONLY) {
  const stale = outputs
    .filter(([file, content]) => !existsSync(file) || readFileSync(file, 'utf8') !== content)
    .map(([file]) => file.replace(`${root}/`, ''))

  if (stale.length > 0) {
    console.error(
      [
        'Сгенерированные типы устарели относительно docs/swagger.json:',
        ...stale.map((file) => `  ${file}`),
        'Выполните: npm run api:types',
      ].join('\n'),
    )
    process.exit(1)
  }
  console.log('Типы соответствуют контракту docs/swagger.json')
  process.exit(0)
}

for (const [file, content] of outputs) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

console.log(
  [
    `схем в контракте: ${Object.keys(schemas).length}`,
    `изменено схем: ${totals.patched}`,
    `проставлено required: ${totals.required}`,
    `проставлено format: date-time: ${totals.dates}`,
    `свёрнуто enum+$ref: ${totals.enums}`,
    `типы: ${OUT_SCHEMA.replace(`${root}/`, '')}`,
    `псевдонимы: ${OUT_ALIASES.replace(`${root}/`, '')}`,
    `контракт: ${OUT_SPEC.replace(`${root}/`, '')}`,
  ].join('\n'),
)
