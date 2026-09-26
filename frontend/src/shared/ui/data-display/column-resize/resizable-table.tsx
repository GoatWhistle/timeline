import { type ComponentProps, createContext, type ReactNode, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { SortIcon } from '@/shared/ui/data-display/sort-icon'
import { ColumnResizeHandle } from './column-resize-handle'
import { useColumnWidths } from './use-column-widths'

export type TableColumn = { id: string; width: number; fixed?: boolean }

type Widths = {
  flexible: string
  widthOf: (column: string) => number
  resize: (column: string, width: number) => void
  reset: (column: string) => void
}

const WidthsContext = createContext<Widths | null>(null)

export const HEAD_CELL = 'h-row px-3 align-middle font-medium text-meta text-muted-foreground'

export function ResizableTable({
  storageKey,
  columns,
  flexible,
  className,
  children,
  ...props
}: Omit<ComponentProps<'table'>, 'style'> & {
  storageKey: string
  columns: readonly TableColumn[]
  flexible: string
  children: ReactNode
}) {
  const sized = columns.filter((column) => !column.fixed)
  const trailing = columns.reduce((sum, column) => sum + (column.fixed ? column.width : 0), 0)
  const widths = useColumnWidths({
    storageKey,
    columns: sized.map((column) => column.id),
    base: Object.fromEntries(sized.map((column) => [column.id, column.width])),
    flexible,
    trailing,
  })

  return (
    <div className="w-full overflow-x-auto rounded-surface border">
      <table
        data-resizable-table=""
        className={cn(
          'table-fixed border-collapse text-copy',
          '[&_tbody_td]:text-center [&_tbody_td[data-lead]]:text-left',
          className,
        )}
        style={widths.tableStyle}
        {...props}
      >
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.id}
              data-column={column.id}
              style={{ width: column.fixed ? column.width : widths.colWidth(column.id) }}
            />
          ))}
        </colgroup>
        <WidthsContext.Provider
          value={{
            flexible,
            widthOf: widths.widthOf,
            resize: widths.resize,
            reset: widths.reset,
          }}
        >
          {children}
        </WidthsContext.Provider>
      </table>
    </div>
  )
}

export type HeadSort = { active: boolean; order: 'asc' | 'desc'; onSort: () => void }

function SortButton({ label, sort }: { label: string; sort: HeadSort }) {
  return (
    <button
      type="button"
      onClick={sort.onSort}
      className={cn(
        'inline-flex max-w-full items-center gap-1',
        TOUCH_REACH,
        'transition-colors duration-instant ease-out',
        'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring',
        sort.active ? 'text-foreground' : 'hover:text-foreground',
      )}
    >
      <span className="truncate">{label}</span>
      <SortIcon active={sort.active} order={sort.order} />
    </button>
  )
}

export function ResizableHead({
  column,
  label,
  sort,
  className,
  children,
  ...props
}: ComponentProps<'th'> & { column: string; label: string; sort?: HeadSort }) {
  const { t } = useTranslation('common')
  const widths = useContext(WidthsContext)
  if (!widths) throw new Error('ResizableHead must sit inside a ResizableTable')
  const leading = column === widths.flexible
  const sorted = sort?.active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined

  return (
    <th
      scope="col"
      aria-sort={sorted}
      data-lead={leading || undefined}
      className={cn(
        'relative pointer-coarse:h-11 last:[&>[data-column-resize]]:translate-x-0',
        HEAD_CELL,
        leading ? 'text-left' : 'text-center',
        className,
      )}
      {...props}
    >
      {children ??
        (sort ? (
          <SortButton label={label} sort={sort} />
        ) : (
          <span className="block truncate">{label}</span>
        ))}
      <ColumnResizeHandle
        label={t('table.resize', { column: label })}
        width={widths.widthOf(column)}
        onResize={(width) => widths.resize(column, width)}
        onReset={() => widths.reset(column)}
      />
    </th>
  )
}
