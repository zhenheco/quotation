'use client'

import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 定價頁面最終 CTA 區塊
 */
export function FinalCTA() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 px-6 py-12 text-center text-white shadow-xl shadow-primary/25 sm:px-12 sm:py-16">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* 圖示 */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        {/* 標題 */}
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">準備好開始了嗎？</h2>

        {/* 副標題 */}
        <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
          立即免費試用 14 天，無需信用卡。
          <br className="hidden sm:block" />
          體驗專業報價系統如何提升您的業務效率。
        </p>

        {/* 按鈕 */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            className="w-full bg-white text-primary shadow-lg hover:bg-white/90 sm:w-auto"
            asChild
          >
            <a href="/register">
              免費開始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto"
            asChild
          >
            <a href="/contact">
              <MessageCircle className="mr-2 h-4 w-4" />
              聯繫業務
            </a>
          </Button>
        </div>

        {/* 底部說明 */}
        <p className="mt-8 text-sm text-white/60">
          已有帳戶？
          <a href="/login" className="ml-1 text-white hover:underline">
            立即登入
          </a>
        </p>
      </div>
    </section>
  )
}
