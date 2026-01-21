'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20 px-4 overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{
        backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-md mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              專業報價與財務管理系統
            </span>
          </div>

          {/* 主標題 */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            讓您的業務
            <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              更高效運營
            </span>
          </h1>

          {/* 副標題 */}
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            快速建立報價單、追蹤訂單、自動化會計處理
            <br className="hidden md:block" />
            讓您專注於成長，而非瑣碎事務
          </p>

          {/* CTA 按鈕組 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="group text-base px-8" asChild>
              <Link href="/login">
                免費開始
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link href="/pricing">查看方案</Link>
            </Button>
          </div>

          {/* 信任指標 */}
          <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              已被數千家企業信賴使用
            </p>
            <div className="flex justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>99.9% 可用性</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>銀行級安全</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>24/7 支援</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
