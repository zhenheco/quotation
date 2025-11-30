'use client'

import { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
  mobileLabel?: string
  mobileHidden?: boolean
  className?: string
  headerClassName?: string
}

export interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  renderMobileCard?: (item: T) => ReactNode
  emptyState?: ReactNode
  isLoading?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectChange?: (id: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  actions?: (item: T) => ReactNode
  className?: string
}

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

export default function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  renderMobileCard,
  emptyState,
  isLoading,
  selectable,
  selectedIds,
  onSelectChange,
  onSelectAll,
  actions,
  className = '',
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-16 bg-gray-200 rounded w-full"></div>
        <div className="h-16 bg-gray-200 rounded w-full"></div>
        <div className="h-16 bg-gray-200 rounded w-full"></div>
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  const allSelected = data.length > 0 && selectedIds?.size === data.length

  const renderCellContent = (item: T, column: Column<T>): ReactNode => {
    if (column.render) {
      return column.render(item)
    }
    const value = getNestedValue(item, column.key as string)
    if (value === null || value === undefined) return '-'
    return String(value)
  }

  const defaultMobileCard = (item: T) => {
    const visibleColumns = columns.filter((col) => !col.mobileHidden)
    const primaryColumn = visibleColumns[0]
    const secondaryColumns = visibleColumns.slice(1)

    return (
      <div className="p-4 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            {selectable && onSelectChange && (
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={selectedIds?.has(keyExtractor(item)) || false}
                  onChange={(e) => onSelectChange(keyExtractor(item), e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div
              className={onRowClick ? 'cursor-pointer' : ''}
              onClick={() => onRowClick?.(item)}
            >
              {primaryColumn && (
                <h4 className="font-medium text-gray-900">
                  {renderCellContent(item, primaryColumn)}
                </h4>
              )}
            </div>
          </div>
          {actions && <div className="flex-shrink-0">{actions(item)}</div>}
        </div>

        <div className="space-y-2 text-sm">
          {secondaryColumns.map((column, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-500">{column.mobileLabel || column.header}</span>
              <span className="text-gray-900">{renderCellContent(item, column)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(keyExtractor(item)) || false}
                      onChange={(e) => onSelectChange?.(keyExtractor(item), e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                {columns.map((column, index) => (
                  <td
                    key={index}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                  >
                    {renderCellContent(item, column)}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(item)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {selectable && onSelectAll && data.length > 0 && (
          <div className="p-3 bg-gray-50 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </div>
        )}
        {data.map((item) => (
          <div key={keyExtractor(item)}>
            {renderMobileCard ? renderMobileCard(item) : defaultMobileCard(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
