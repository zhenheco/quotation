/**
 * Locale 層級 Loading 組件
 * 頁面切換時顯示，避免黑屏
 */
export default function LocaleLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
