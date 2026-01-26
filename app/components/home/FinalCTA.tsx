'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Rocket, CheckCircle2 } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 dark:from-teal-700 dark:via-teal-800 dark:to-blue-800 text-white relative overflow-hidden">
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
          <Rocket className="w-8 h-8" />
        </div>

        {/* 標題 */}
        <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
          立即開始，省下 90% 的時間
        </h2>

        {/* 價值強調 */}
        <p className="text-xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed">
          加入 <span className="font-bold text-teal-200">500+ 企業</span>，使用專業報價與財務管理系統
        </p>

        {/* 痛點對比 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80 mb-10">
          <span className="line-through text-white/50">手動 30 分鐘做報價單</span>
          <span className="text-teal-200 font-medium">→ 系統自動 5 分鐘完成</span>
        </div>

        {/* CTA 按鈕組 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            size="lg"
            className="group text-lg px-10 py-7 bg-white text-teal-700 hover:bg-white/90 font-bold shadow-lg shadow-black/20"
            asChild
          >
            <Link href="/login">
              免費試用 14 天
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="text-lg px-8 py-7 bg-transparent border-white/50 text-white hover:bg-white/10 hover:border-white"
            asChild
          >
            <Link href="/pricing">查看方案與價格</Link>
          </Button>
        </div>

        {/* 信任標語 */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-300" />
            免費試用
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-300" />
            無需信用卡
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-300" />
            隨時取消
          </span>
        </div>
      </div>
    </section>
  )
}
