'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary via-primary to-indigo-600 dark:from-primary dark:via-indigo-600 dark:to-purple-700 text-white relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
          <Sparkles className="w-8 h-8" />
        </div>

        {/* 標題 */}
        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
          準備開始了嗎？
        </h2>

        {/* 描述 */}
        <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
          加入數千家企業，使用我們的專業報價與財務管理系統
          <br className="hidden md:block" />
          讓您的業務運營更高效
        </p>

        {/* CTA 按鈕組 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            variant="secondary"
            className="group text-base px-8 bg-white text-primary hover:bg-white/90"
            asChild
          >
            <Link href="/login">
              免費開始
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 bg-transparent border-white text-white hover:bg-white/10"
            asChild
          >
            <Link href="/pricing">查看方案</Link>
          </Button>
        </div>

        {/* 信任標語 */}
        <p className="mt-12 text-sm text-primary-foreground/70">
          ✓ 免費試用  ·  ✓ 無需信用卡  ·  ✓ 隨時取消
        </p>
      </div>
    </section>
  )
}
