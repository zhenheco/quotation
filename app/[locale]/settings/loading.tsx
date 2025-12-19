/**
 * 設定頁面載入骨架屏
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-10 bg-gray-200 rounded w-full mb-3" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-10 bg-gray-200 rounded w-full mb-3" />
          <div className="h-10 bg-gray-200 rounded w-full" />
        </div>
      </div>
    </div>
  )
}
