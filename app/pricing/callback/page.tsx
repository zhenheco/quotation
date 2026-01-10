'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, ArrowRight, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

type PaymentStatus = 'success' | 'failed' | 'pending' | 'loading'

interface PaymentResult {
  status: PaymentStatus
  orderId?: string
  amount?: number
  tier?: string
  message?: string
}

/**
 * 付款結果頁面
 * 處理 PAYUNi 付款完成後的導回
 */
export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const [result, setResult] = useState<PaymentResult>({ status: 'loading' })

  useEffect(() => {
    // 解析 URL 參數
    const status = searchParams.get('status')
    const orderId = searchParams.get('order_id') || searchParams.get('MerchantOrderNo')
    const amount = searchParams.get('amount') || searchParams.get('Amt')
    const tier = searchParams.get('tier')
    const message = searchParams.get('message')

    // 根據狀態設定結果
    if (status === 'success' || status === 'SUCCESS') {
      setResult({
        status: 'success',
        orderId: orderId || undefined,
        amount: amount ? parseInt(amount, 10) : undefined,
        tier: tier || undefined,
        message: message || '您的訂閱已成功升級！',
      })
    } else if (status === 'failed' || status === 'FAILED') {
      setResult({
        status: 'failed',
        orderId: orderId || undefined,
        message: message || '付款處理失敗，請稍後再試。',
      })
    } else if (status === 'pending' || status === 'PENDING') {
      setResult({
        status: 'pending',
        orderId: orderId || undefined,
        message: message || '付款處理中，請稍候...',
      })
    } else {
      // 無狀態參數時，假設是成功（PAYUNi 預設行為）
      setResult({
        status: orderId ? 'success' : 'pending',
        orderId: orderId || undefined,
        amount: amount ? parseInt(amount, 10) : undefined,
        tier: tier || undefined,
        message: orderId ? '付款已完成！' : '正在確認付款狀態...',
      })
    }
  }, [searchParams])

  // 載入中
  if (result.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/20 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-0">
          {/* 狀態圖示區 */}
          <div
            className={cn(
              'flex flex-col items-center justify-center px-6 py-12',
              result.status === 'success' && 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
              result.status === 'failed' && 'bg-gradient-to-br from-red-50 to-red-100/50',
              result.status === 'pending' && 'bg-gradient-to-br from-amber-50 to-amber-100/50'
            )}
          >
            {result.status === 'success' && (
              <div className="animate-scale-in">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-lg shadow-emerald-200/50">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
            )}

            {result.status === 'failed' && (
              <div className="animate-scale-in">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 shadow-lg shadow-red-200/50">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>
            )}

            {result.status === 'pending' && (
              <div className="animate-scale-in">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 shadow-lg shadow-amber-200/50">
                  <Clock className="h-10 w-10 text-amber-600" />
                </div>
              </div>
            )}

            <h1
              className={cn(
                'mt-6 text-2xl font-bold',
                result.status === 'success' && 'text-emerald-700',
                result.status === 'failed' && 'text-red-700',
                result.status === 'pending' && 'text-amber-700'
              )}
            >
              {result.status === 'success' && '付款成功'}
              {result.status === 'failed' && '付款失敗'}
              {result.status === 'pending' && '處理中'}
            </h1>

            <p className="mt-2 text-center text-muted-foreground">{result.message}</p>
          </div>

          {/* 訂單資訊 */}
          <div className="space-y-4 p-6">
            {result.orderId && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-muted-foreground">訂單編號</span>
                <span className="font-mono text-sm font-medium">{result.orderId}</span>
              </div>
            )}

            {result.amount && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-muted-foreground">付款金額</span>
                <span className="font-semibold text-foreground">
                  NT${result.amount.toLocaleString('zh-TW')}
                </span>
              </div>
            )}

            {result.tier && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-muted-foreground">訂閱方案</span>
                <span className="font-medium text-foreground">
                  {result.tier === 'STARTER' && '入門版'}
                  {result.tier === 'STANDARD' && '標準版'}
                  {result.tier === 'PROFESSIONAL' && '專業版'}
                  {!['STARTER', 'STANDARD', 'PROFESSIONAL'].includes(result.tier) && result.tier}
                </span>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="mt-6 space-y-3">
              {result.status === 'success' && (
                <>
                  <Button className="w-full" size="lg" asChild>
                    <a href="/dashboard">
                      前往儀表板
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" size="lg" asChild>
                    <a href="/settings/subscription">
                      查看訂閱詳情
                    </a>
                  </Button>
                </>
              )}

              {result.status === 'failed' && (
                <>
                  <Button className="w-full" size="lg" asChild>
                    <a href="/pricing">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新選擇方案
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" size="lg" asChild>
                    <a href="/contact">
                      聯繫客服
                    </a>
                  </Button>
                </>
              )}

              {result.status === 'pending' && (
                <>
                  <Button className="w-full" size="lg" asChild>
                    <a href="/dashboard">
                      <Home className="mr-2 h-4 w-4" />
                      返回儀表板
                    </a>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    付款確認後，系統會自動更新您的訂閱狀態。
                    <br />
                    如有問題請聯繫客服。
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
