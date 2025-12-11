'use client'

interface SkeletonProps {
  className?: string
}

/**
 * 基礎骨架屏元件
 * 用於顯示載入中的佔位符
 */
export function Skeleton({ className }: SkeletonProps) {
  const baseClasses = 'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700'
  return (
    <div className={className ? `${baseClasses} ${className}` : baseClasses} />
  )
}

interface TableSkeletonProps {
  /** 列數 */
  rows?: number
  /** 欄數 */
  cols?: number
}

/**
 * 表格骨架屏
 * 用於列表頁面載入時顯示
 */
export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* 表頭 */}
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* 表格列 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-10 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * 儀表板骨架屏
 * 用於 Dashboard 頁面載入時顯示
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`stat-${i}`}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * 列表頁骨架屏
 * 用於產品、客戶等列表頁面
 */
export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 標題和操作區 */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 搜尋和篩選區 */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* 表格區域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <TableSkeleton rows={8} cols={5} />
      </div>

      {/* 分頁 */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  )
}
