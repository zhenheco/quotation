'use client'

/**
 * 付款完成 Callback 頁面
 *
 * 顯示付款成功或失敗的訊息，並提供導航選項
 * 成功時 3 秒後自動導向到 dashboard
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Home, Settings } from 'lucide-react'

export default function CallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')

  const statusParam = searchParams.get('status') || ''
  const message = searchParams.get('message') || ''

  useEffect(() => {
    // 判斷付款狀態
    const isSuccess = statusParam === 'success' || statusParam === 'SUCCESS'

    if (isSuccess) {
      setStatus('success')

      // 3 秒後自動導向到 dashboard
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

      return () => clearTimeout(timer)
    } else {
      setStatus('failed')
    }
  }, [statusParam, router])

  // Loading 狀態
  if (status === 'loading') {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">處理中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 成功狀態
  if (status === 'success') {
    const displayMessage = message || '付款成功！'

    return (
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">付款完成</h1>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">{displayMessage}</p>

            <div className="rounded-lg bg-accent p-4">
              <p className="text-sm font-medium">感謝您的訂閱！您的方案已經生效。</p>
              <p className="mt-2 text-xs text-muted-foreground">即將跳轉到儀表板...</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button className="w-full" asChild>
                <a href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  前往儀表板
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">如有任何問題，請聯繫客戶服務</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 失敗狀態
  const displayMessage = message || '付款失敗或已取消'

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">付款未完成</h1>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">{displayMessage}</p>

          <div className="flex flex-col gap-3">
            <Button variant="default" className="w-full" asChild>
              <a href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                前往儀表板
              </a>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <a href="/pricing">
                <Settings className="mr-2 h-4 w-4" />
                重新選擇方案
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">如有任何問題，請聯繫客戶服務</p>
        </CardContent>
      </Card>
    </div>
  )
}
