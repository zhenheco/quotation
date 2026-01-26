'use client'

import { DollarSign, Clock, AlertTriangle } from 'lucide-react'

const PAIN_POINTS = [
  {
    icon: DollarSign,
    title: '請會計師太貴',
    description: '每月記帳費 NT$3,000-8,000，加上報稅、稅務諮詢，一年下來花費超過 NT$50,000',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    icon: Clock,
    title: '自己做太慢',
    description: 'Excel 報價單格式混亂、公式容易出錯，製作一份報價單要花 30 分鐘以上',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    icon: AlertTriangle,
    title: '容易出錯',
    description: '稅額計算錯誤、報價轉訂單資料遺漏、出貨數量對不上，客戶抱怨不斷',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
]

export function PainPointsSection() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            您是否也有這些困擾？
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PAIN_POINTS.map((pain, index) => {
            const Icon = pain.icon
            return (
              <div
                key={index}
                className={`${pain.bgColor} rounded-2xl p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
              >
                <Icon className={`h-10 w-10 ${pain.color} mb-4`} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {pain.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {pain.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* 解決方案引導 */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 text-lg font-semibold text-teal-600 dark:text-teal-400">
            <span>👇</span>
            報價單系統一次解決所有問題
          </div>
        </div>
      </div>
    </section>
  )
}
