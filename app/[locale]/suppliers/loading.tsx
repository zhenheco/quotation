/**
 * 供應商列表頁載入骨架屏
 */
export default function SuppliersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-28" />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="h-4 bg-gray-200 rounded w-full mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
      </div>
    </div>
  )
}
