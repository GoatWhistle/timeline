export const USER_COLUMNS = [
  'name',
  'email',
  'nickname',
  'telegram',
  'role',
  'state',
  'verified',
  'created',
  'locale',
  'timezone',
] as const
export type UserColumn = (typeof USER_COLUMNS)[number]

export const USER_COLUMN_KEY: Record<UserColumn, string> = {
  name: 'users.column.name',
  email: 'users.column.email',
  nickname: 'users.column.nickname',
  telegram: 'users.column.telegram',
  role: 'users.column.role',
  state: 'users.column.state',
  verified: 'users.column.verified',
  created: 'users.column.created',
  locale: 'users.column.locale',
  timezone: 'users.column.timezone',
}

export const USER_LOCKED_COLUMN: UserColumn = 'name'

export const DEFAULT_USER_COLUMNS: UserColumn[] = ['name', 'email', 'telegram', 'role', 'state']

export function resolveUserColumns(value: unknown): UserColumn[] {
  if (!Array.isArray(value)) return DEFAULT_USER_COLUMNS
  const picked = USER_COLUMNS.filter((column) => value.includes(column))
  if (picked.length === 0) return DEFAULT_USER_COLUMNS
  return picked.includes(USER_LOCKED_COLUMN) ? picked : [USER_LOCKED_COLUMN, ...picked]
}

export const USER_SORTS = ['name', 'email', 'created_at'] as const
export type UserSort = (typeof USER_SORTS)[number]

export const USER_SORT_KEY: Record<UserSort, string> = {
  name: 'users.sort.name',
  email: 'users.sort.email',
  created_at: 'users.sort.created',
}

export const DEFAULT_USER_SORT: UserSort = 'name'

export function resolveUserSort(value: string): UserSort {
  return USER_SORTS.includes(value as UserSort) ? (value as UserSort) : DEFAULT_USER_SORT
}

export const USER_FILTER_FIELDS = ['active', 'admin', 'telegram'] as const
export type UserFilterField = (typeof USER_FILTER_FIELDS)[number]

export const USER_FILTER_FIELD_KEY: Record<UserFilterField, string> = {
  active: 'users.field.state',
  admin: 'users.field.role',
  telegram: 'users.field.telegram',
}

export const USER_FILTER_CHOICES: Record<
  UserFilterField,
  readonly { value: string; labelKey: string }[]
> = {
  active: [
    { value: 'true', labelKey: 'users.active' },
    { value: 'false', labelKey: 'users.deactivated' },
  ],
  admin: [
    { value: 'true', labelKey: 'users.roleAdmin' },
    { value: 'false', labelKey: 'users.roleMember' },
  ],
  telegram: [
    { value: 'true', labelKey: 'users.telegramLinked' },
    { value: 'false', labelKey: 'users.telegramMissing' },
  ],
}
