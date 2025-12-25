'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
  // 載入中狀態 - 骨架屏
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-2xl animate-shimmer"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
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

  // 手機版卡片 - 現代圓潤設計
  const defaultMobileCard = (item: T) => {
    const visibleColumns = columns.filter((col) => !col.mobileHidden)
    const primaryColumn = visibleColumns[0]
    const secondaryColumns = visibleColumns.slice(1)

    return (
      <div
        className={cn(
          'p-4 bg-white rounded-2xl border border-slate-100 shadow-sm',
          'transition-all duration-200',
          onRowClick && 'active:scale-[0.99] cursor-pointer'
        )}
        onClick={() => onRowClick?.(item)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {selectable && onSelectChange && (
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={selectedIds?.has(keyExtractor(item)) || false}
                  onChange={(e) => onSelectChange(keyExtractor(item), e.target.checked)}
                  className="h-5 w-5 rounded-lg border-2 border-slate-300 text-emerald-500 focus:ring-emerald-500/20 focus:ring-4 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {primaryColumn && (
                <h4 className="font-semibold text-slate-800 truncate">
                  {renderCellContent(item, primaryColumn)}
                </h4>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              {actions(item)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {secondaryColumns.map((column, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-slate-400 text-xs">{column.mobileLabel || column.header}</span>
              <span className="text-slate-700 font-medium truncate">{renderCellContent(item, column)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Desktop Table - 現代無線框設計 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {selectable && (
                <th className="px-6 py-4 text-left w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-5 w-5 rounded-lg border-2 border-slate-300 text-emerald-500 focus:ring-emerald-500/20 focus:ring-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider',
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIndex) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'group transition-colors duration-150',
                  'hover:bg-slate-50',
                  onRowClick && 'cursor-pointer',
                  rowIndex !== data.length - 1 && 'border-b border-slate-50'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(keyExtractor(item)) || false}
                      onChange={(e) => onSelectChange?.(keyExtractor(item), e.target.checked)}
                      className="h-5 w-5 rounded-lg border-2 border-slate-300 text-emerald-500 focus:ring-emerald-500/20 focus:ring-4 cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((column, index) => (
                  <td
                    key={index}
                    className={cn(
                      'px-6 py-5 text-sm text-slate-700',
                      column.className
                    )}
                  >
                    {renderCellContent(item, column)}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-6 py-5 text-right text-sm"
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

      {/* Mobile Cards - 卡片列表 */}
      <div className="md:hidden space-y-3 p-3">
        {selectable && onSelectAll && data.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="h-5 w-5 rounded-lg border-2 border-slate-300 text-emerald-500 focus:ring-emerald-500/20 focus:ring-4 cursor-pointer"
            />
            <span className="text-sm text-slate-600 font-medium">
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
