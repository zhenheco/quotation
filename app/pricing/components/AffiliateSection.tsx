'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Gift, Users, Coins, ArrowRight, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCompany } from '@/hooks/useCompany'
import { AFFILIATE_CONFIG } from '../constants/pricing-features'

interface AffiliateStats {
  referralCode: string
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
}

/**
 * Affiliate 推薦計劃區塊
 * 顯示推薦碼和佣金資訊
 */
export function AffiliateSection() {
  const { company } = useCompany()
  const isLoggedIn = !!company

  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [isLoading, setIsLoading] = useState(isLoggedIn)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  // 追蹤 isLoggedIn 變化，用 render 階段同步模式
  const [prevIsLoggedIn, setPrevIsLoggedIn] = useState(isLoggedIn)
  if (isLoggedIn !== prevIsLoggedIn) {
    setPrevIsLoggedIn(isLoggedIn)
    if (isLoggedIn) {
      setIsLoading(true)
    }
  }

  // 取得推薦碼資訊
  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/user/referral-code')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStats(data.data)
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [isLoggedIn])

  const referralLink = stats?.referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${stats.referralCode}`
    : ''

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // 未登入狀態
  if (!isLoggedIn) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50 p-8 md:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
              <Gift className="h-8 w-8 text-white" />
            </div>

            <h2 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl">
              推薦好友，賺取回饋
            </h2>

            <p className="mb-8 text-muted-foreground">
              每成功推薦一位付費用戶，您可獲得{' '}
              <span className="font-semibold text-purple-600">
                {AFFILIATE_CONFIG.commissionRate * 100}% 佣金
              </span>
              ！
              <br />
              被推薦者還可享首月{' '}
              <span className="font-semibold text-purple-600">
                {AFFILIATE_CONFIG.referralDiscount * 100}% 折扣
              </span>
              。
            </p>

            <Button size="lg" asChild className="shadow-lg shadow-primary/25">
              <a href="/login?redirect=/pricing">
                <LogIn className="mr-2 h-4 w-4" />
                登入後取得推薦碼
              </a>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // 已登入狀態
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50">
        {/* 標題區 */}
        <div className="border-b border-purple-100 bg-gradient-to-r from-purple-500/10 to-transparent px-6 py-8 md:px-12">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">推薦計劃</h2>
              <p className="text-sm text-muted-foreground">
                推薦好友使用，雙方都能獲得好處
              </p>
            </div>
          </div>
        </div>

        {/* 內容區 */}
        <div className="grid gap-6 p-6 md:grid-cols-2 md:p-12">
          {/* 左側 - 佣金說明 */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
              <h3 className="mb-4 text-lg font-semibold text-foreground">您可獲得</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                    <Coins className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {AFFILIATE_CONFIG.commissionRate * 100}% 佣金
                    </div>
                    <div className="text-sm text-muted-foreground">
                      每位成功推薦的付費用戶
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                    <Users className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">無上限推薦人數</div>
                    <div className="text-sm text-muted-foreground">推薦越多賺越多</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 統計數據 */}
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-purple-100">
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalReferrals}
                  </div>
                  <div className="text-sm text-muted-foreground">總推薦人數</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-purple-100">
                  <div className="text-2xl font-bold text-purple-600">
                    NT${stats.totalEarnings.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">累計佣金</div>
                </div>
              </div>
            )}
          </div>

          {/* 右側 - 推薦碼 */}
          <div className="space-y-4">
            {/* 推薦碼 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">您的推薦碼</h3>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  專屬
                </Badge>
              </div>

              {isLoading ? (
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-mono text-lg font-semibold text-foreground">
                    {stats?.referralCode || '--------'}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => stats?.referralCode && copyToClipboard(stats.referralCode, 'code')}
                    disabled={!stats?.referralCode}
                  >
                    {copied === 'code' ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* 推薦連結 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-purple-100">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">推薦連結</h3>
              </div>

              {isLoading ? (
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 truncate rounded-xl bg-slate-100 px-4 py-3 text-sm text-muted-foreground">
                    {referralLink || 'https://...'}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => referralLink && copyToClipboard(referralLink, 'link')}
                    disabled={!referralLink}
                  >
                    {copied === 'link' ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* 了解更多 */}
            <Button
              variant="ghost"
              className="w-full text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              asChild
            >
              <a href="/affiliate">
                了解推薦計劃詳情
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
