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
 * Fields that per the specification really may be absent from the response.
 * Everything else is treated as required: the contract does not set `required`,
 * which without this patch would make every field optional.
 */
const OPTIONAL = {
  'dto.AuditResponse': [
    'actor_user_id',
    'actor_email',
    'before',
    'after',
    'entity_id',
    'request_id',
  ],
  'dto.BatchItemResult': ['id', 'key', 'code', 'message'],
  'dto.DeadlineItem': ['overdue_minutes'],
  'dto.ErrorBody': ['fields'],
  'dto.EventCard': ['next_stage', 'registration', 'registration_status', 'team_role'],
  'dto.EventResponse': [
    'description',
    'organizer',
    'website_url',
    'notes',
    'published_at',
    'archived_at',
    'country_code',
    'city',
    'track',
    'prize_pool',
    'prize_currency',
    'team_size_min',
    'team_size_max',
    'cover_url',
    'cover_source',
  ],
  'dto.CatalogEvent': [
    'description',
    'organizer',
    'website_url',
    'country_code',
    'city',
    'track',
    'prize_pool',
    'prize_currency',
    'team_size_min',
    'team_size_max',
  ],
  'dto.CatalogPlace': [],
  'models.Place': ['country_code', 'city', 'venue', 'online_url'],
  'dto.InvitePreview': ['email', 'expires_at'],
  'dto.InviteResponse': ['accepted_at', 'revoked_at'],
  'dto.MeResponse': [
    'middle_name',
    'legacy_display_name',
    'nickname',
    'pending_email',
    'telegram_username',
    'preferred_channel',
    'avatar_url',
    'bio',
    'github_url',
    'website_url',
  ],
  'dto.UserSummary': ['middle_name', 'nickname'],
  'dto.PublicProfileResponse': ['middle_name', 'avatar_url', 'bio'],
  'dto.MyEventItem': [
    'organizer',
    'next_stage',
    'registration_deadline',
    'registration_status',
    'registration_url',
  ],
  'dto.NotificationRuleResponse': ['channel_override'],
  'dto.ParticipantResponse': ['removed_at', 'registration_status'],
  'dto.RegistrationCoverage': ['share'],
  'dto.RegistrationPublic': ['description', 'deadline_at'],
  'dto.RegistrationResponse': ['description', 'deadline_at'],
  'dto.RegistrationStatusResponse': ['last_changed_by_user_id', 'note', 'registered_at'],
  'dto.RegistrationStatusShort': ['note', 'registered_at'],
  'dto.StageResponse': [
    'description',
    'url',
    'format',
    'country_code',
    'city',
    'venue',
    'online_url',
  ],
  'dto.ScheduleRow': ['registration_deadline', 'registration_status', 'team_role'],
  'dto.TeamMemberResponse': ['joined_at', 'left_at'],
  'dto.TeamRosterMemberResponse': ['registration_status'],
  'dto.TeamEventEntryResponse': ['team_size_min', 'team_size_max'],
  'dto.TeamJoinLinkResponse': ['id', 'expires_at'],
  'dto.WorkerHeartbeatResponse': ['scheduler_last_run_at', 'worker_last_run_at'],
}

/** Field names that per the API conventions are an RFC 3339 instant. */
const DATE_TIME_FIELDS = new Set(['time', 'from', 'to', 'registration_deadline'])
const isDateTime = (name) => name.endsWith('_at') || DATE_TIME_FIELDS.has(name)

function patchSchema(name, schema) {
  const props = schema.properties
  if (!props) return { required: 0, dates: 0, enums: 0 }

  let dates = 0
  let enums = 0

  for (const [prop, value] of Object.entries(props)) {
    if (isDateTime(prop) && value.type === 'string' && !value.format) {
      value.format = 'date-time'
      dates += 1
    }
    if (Array.isArray(value.allOf) && value.allOf.length === 1 && value.allOf[0].$ref) {
      const ref = value.allOf[0].$ref
      const description = value.description
      for (const key of Object.keys(value)) delete value[key]
      value.$ref = ref
      if (description) value.description = description
      enums += 1
    }
  }

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

const PREFIXES = ['models.', 'dto.']
const aliases = Object.keys(schemas)
  .filter((name) => PREFIXES.some((prefix) => name.startsWith(prefix)))
  .map((name) => [name.slice(name.indexOf('.') + 1), name])
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

openapi['x-generated-by'] = 'frontend/scripts/generate-api-types.mjs - do not edit by hand'
outputs.push([OUT_SPEC, `${JSON.stringify(openapi, null, 2)}\n`])

if (CHECK_ONLY) {
  const stale = outputs
    .filter(([file, content]) => !existsSync(file) || readFileSync(file, 'utf8') !== content)
    .map(([file]) => file.replace(`${root}/`, ''))

  if (stale.length > 0) {
    console.error(
      [
        'Generated types are out of date relative to docs/swagger.json:',
        ...stale.map((file) => `  ${file}`),
        'Run: npm run api:types',
      ].join('\n'),
    )
    process.exit(1)
  }
  console.log('Types match the docs/swagger.json contract')
  process.exit(0)
}

for (const [file, content] of outputs) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content, 'utf8')
}

console.log(
  [
    `schemas in the contract: ${Object.keys(schemas).length}`,
    `schemas changed: ${totals.patched}`,
    `required set: ${totals.required}`,
    `format: date-time set: ${totals.dates}`,
    `enum+$ref collapsed: ${totals.enums}`,
    `types: ${OUT_SCHEMA.replace(`${root}/`, '')}`,
    `aliases: ${OUT_ALIASES.replace(`${root}/`, '')}`,
    `contract: ${OUT_SPEC.replace(`${root}/`, '')}`,
  ].join('\n'),
)
