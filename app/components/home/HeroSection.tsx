'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const TRUST_BADGES = ['14 天免費試用', '無需信用卡', '5 分鐘上手'] as const

const TYPING_DELAYS = [0, 150, 300]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {TYPING_DELAYS.map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

function LineMessageBubble() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),   // 顯示「對方正在輸入」
      setTimeout(() => setStep(2), 2000),  // 顯示客戶訊息
      setTimeout(() => setStep(3), 3500),  // 顯示嘆氣反應
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 模擬聊天視窗 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* 聊天 header */}
        <div className="bg-teal-600 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            王
          </div>
          <div>
            <div className="text-white text-sm font-medium">王經理 — 大成貿易</div>
            <div className="text-teal-100 text-xs">
              {step >= 1 && step < 2 ? '對方正在輸入...' : '上午 9:03'}
            </div>
          </div>
        </div>

        {/* 聊天內容 */}
        <div className="p-4 min-h-[140px] flex flex-col justify-end gap-3">
          {step >= 1 && step < 2 && (
            <div className="flex items-end gap-2">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]">
                <TypingDots />
              </div>
            </div>
          )}

          {step >= 2 && (
            <div className="flex items-end gap-2 animate-fade-in-up">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-slate-900 dark:text-white text-sm leading-relaxed">
                  陳老闆，上次談的那批貨，報價單今天能出嗎？客戶在催了 🙏
                </p>
              </div>
            </div>
          )}

          {step >= 3 && (
            <div className="flex items-end justify-end gap-2 animate-fade-in-up">
              <div className="bg-teal-500 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-white text-sm">好，我開 Excel 算一下...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  const [showTransition, setShowTransition] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowTransition(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-20 px-4 overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #0d9488 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <div className="relative max-w-5xl mx-auto">
        {/* 時間標籤 */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-mono">
            星期一 ── 早上 9:03
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* 左側：故事文案 */}
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              又收到客戶催報價的訊息，
              <span className="block mt-2 text-slate-400 dark:text-slate-500">
                又要打開那個 Excel...
              </span>
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              找範本、算稅額、調格式、轉 PDF、寄出去。<br />
              一份報價單，花掉你整個早上。
            </p>

            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              這一幕，<span className="text-slate-900 dark:text-white font-semibold">每個禮拜都在重播。</span>
            </p>

            {/* 轉折 */}
            <div className={`transition-all duration-700 ${showTransition ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-xl font-semibold text-teal-600 dark:text-teal-400 mb-6">
                如果下次收到催報價的訊息——<br />
                你只需要 3 次點擊，報價單就自動寄出了呢？
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start items-center mb-6">
                <Button size="lg" className="group text-lg px-8 py-7 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-600/30" asChild>
                  <Link href="/login">
                    免費試用 — 讓星期一不再可怕
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>

              {/* 信任指標 */}
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm">
                {TRUST_BADGES.map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：LINE 對話動畫 */}
          <div className="order-first md:order-last">
            <LineMessageBubble />
          </div>
        </div>
      </div>
    </section>
  )
}
