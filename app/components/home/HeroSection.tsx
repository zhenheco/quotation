'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Calculator, FileText, TrendingUp } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-teal-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-20 px-4 overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{
        backgroundImage: `linear-gradient(to right, #0d9488 1px, transparent 1px),
                          linear-gradient(to bottom, #0d9488 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* 光暈效果 */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center">
          {/* 社會認證徽章 */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-white text-xs font-bold">
                B
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-white text-xs font-bold">
                C
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              500+ 企業信賴使用
            </span>
            <div className="flex items-center gap-0.5 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
          </div>

          {/* 痛點引導 */}
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">
            還在用 Excel 做報價單？還在手動計算稅額？
          </p>

          {/* 主標題 */}
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            專業報價、訂單、財務
            <span className="block mt-2 bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent">
              一站式管理系統
            </span>
          </h1>

          {/* 價值主張 */}
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            <span className="text-slate-900 dark:text-white font-semibold">5 分鐘建立專業報價單</span>，
            自動計算稅額、轉換訂單、產生出貨單
          </p>

          {/* 價格錨點 */}
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
            請會計師處理一家公司 <span className="line-through">NT$3,000/月</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold ml-2">→ 自己搞定只要 NT$249/月</span>
          </p>

          {/* CTA 按鈕組 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Button size="lg" className="group text-lg px-10 py-7 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-600/30" asChild>
              <Link href="/login">
                免費試用 — 立即開始
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button size="lg" variant="outline" className="text-lg px-8 py-7 border-slate-300 dark:border-slate-600" asChild>
              <Link href="/pricing">查看方案與價格</Link>
            </Button>
          </div>

          {/* 信任指標 */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
              <span><strong className="text-slate-900 dark:text-white">14 天</strong> 免費試用</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
              <span>無需信用卡</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
              <span>隨時取消</span>
            </div>
          </div>
        </div>

        {/* 產品截圖/數據展示 */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-center hover:shadow-xl transition-shadow cursor-pointer">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-100 dark:bg-teal-900/50 mb-4">
              <Calculator className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">95%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">報價製作時間節省</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-center hover:shadow-xl transition-shadow cursor-pointer">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/50 mb-4">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">50,000+</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">報價單已產生</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 text-center hover:shadow-xl transition-shadow cursor-pointer">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 mb-4">
              <TrendingUp className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">4.9/5</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">用戶滿意度評分</div>
          </div>
        </div>
      </div>
    </section>
  )
}
