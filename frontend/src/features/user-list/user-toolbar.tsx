import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_USER_COLUMNS,
  USER_COLUMN_KEY,
  USER_COLUMNS,
  USER_LOCKED_COLUMN,
  type UserColumn,
} from '@/entities/user/user.views'
import { CatalogColumnsMenu } from '@/features/catalog/catalog-columns-menu'
import { ListToolbar } from '@/shared/ui/layout/list-toolbar'
import { UserFiltersPopover, type UserFilterValues } from './user-filters-popover'

export function UserToolbar({
  filters,
  columns,
  searchValue,
  searchRef,
  onSearch,
  onFilters,
  onResetFilters,
  onToggleColumn,
  onResetColumns,
}: {
  filters: UserFilterValues
  columns: UserColumn[]
  searchValue: string
  searchRef: RefObject<HTMLInputElement | null>
  onSearch: (value: string) => void
  onFilters: (patch: UserFilterValues) => void
  onResetFilters: () => void
  onToggleColumn: (column: UserColumn) => void
  onResetColumns: () => void
}) {
  const { t } = useTranslation()

  return (
    <ListToolbar
      title={t('users.title')}
      search={{
        value: searchValue,
        label: t('users.searchAria'),
        placeholder: t('users.searchPlaceholder'),
        ref: searchRef,
        onChange: onSearch,
      }}
      tools={
        <>
          <UserFiltersPopover values={filters} onChange={onFilters} onReset={onResetFilters} />
          <CatalogColumnsMenu
            columns={columns}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
            all={USER_COLUMNS}
            labels={USER_COLUMN_KEY}
            locked={USER_LOCKED_COLUMN}
            defaults={DEFAULT_USER_COLUMNS}
            namespace="common"
          />
        </>
      }
    />
  )
}
