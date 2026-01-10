'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, Shield, X, Zap, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { SubscriptionPlan, BillingCycle, SubscriptionTier } from '@/hooks/use-subscription'
import { PLAN_DESCRIPTIONS } from '../constants/pricing-features'
import { cn } from '@/lib/utils'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  plan: SubscriptionPlan | null
  billingCycle: BillingCycle
  currentTier?: SubscriptionTier | null
}

/**
 * 付款確認 Modal
 * 顯示訂單摘要並引導用戶前往 PAYUNi 付款
 */
export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  plan,
  billingCycle,
  currentTier,
}: CheckoutModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 重置狀態當 modal 開啟時
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsProcessing(false)
    }
  }, [isOpen])

  // ESC 關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, isProcessing, onClose])

  if (!mounted || !isOpen || !plan) return null

  const price = billingCycle === 'MONTHLY' ? plan.monthly_price : plan.yearly_price
  const pricePerMonth =
    billingCycle === 'YEARLY' ? Math.round(plan.yearly_price / 12) : plan.monthly_price
  const description = PLAN_DESCRIPTIONS[plan.tier]

  const TIER_ORDER: SubscriptionTier[] = ['FREE', 'STARTER', 'STANDARD', 'PROFESSIONAL']
  const isUpgrade = currentTier
    ? TIER_ORDER.indexOf(plan.tier) > TIER_ORDER.indexOf(currentTier)
    : true

  const handleConfirm = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款過程發生錯誤，請稍後再試')
      setIsProcessing(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal 內容 */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl animate-scale-in',
          'overflow-hidden'
        )}
      >
        {/* 關閉按鈕 */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* 頭部 - 漸層背景 */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-6 pt-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {isUpgrade ? '升級至' : '變更為'} {description.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description.subtitle}</p>
        </div>

        {/* 訂單摘要 */}
        <div className="px-6 py-6">
          <div className="rounded-2xl border border-border bg-slate-50/50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-500">訂單摘要</h3>

            <div className="space-y-3">
              {/* 方案 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-600">方案</span>
                </div>
                <span className="text-sm font-medium text-foreground">{description.title}</span>
              </div>

              {/* 計費週期 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-600">計費週期</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {billingCycle === 'MONTHLY' ? '月繳' : '年繳'}
                </span>
              </div>

              {/* 單價 */}
              {billingCycle === 'YEARLY' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-slate-600">月均價格</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    NT${pricePerMonth.toLocaleString('zh-TW')}/月
                  </span>
                </div>
              )}

              {/* 分隔線 */}
              <div className="my-3 border-t border-dashed border-border" />

              {/* 總計 */}
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">
                  {billingCycle === 'MONTHLY' ? '本月應付' : '年度總計'}
                </span>
                <span className="text-xl font-bold text-primary">
                  NT${price.toLocaleString('zh-TW')}
                </span>
              </div>
            </div>
          </div>

          {/* 安全提示 */}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="text-xs text-emerald-700">
              <span className="font-medium">安全付款</span>
              <br />
              您的付款資訊由 PAYUNi 統一金流安全處理，我們不會儲存任何信用卡資訊。
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 按鈕 */}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full shadow-lg shadow-primary/25"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">處理中...</span>
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  前往付款
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={onClose}
              disabled={isProcessing}
            >
              取消
            </Button>
          </div>

          {/* 條款說明 */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            點擊「前往付款」即表示您同意我們的
            <a href="/terms" className="text-primary hover:underline">
              服務條款
            </a>
            和
            <a href="/privacy" className="text-primary hover:underline">
              隱私政策
            </a>
          </p>
        </div>
      </div>
    </div>
  )

  return typeof window !== 'undefined' && mounted
    ? createPortal(modalContent, document.body)
    : null
}
