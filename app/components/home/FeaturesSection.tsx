'use client'

import { FileText, Calculator, BarChart3, Shield, Zap, Users } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: '報價單管理',
    description: '專業範本庫、快速產生 PDF、自動化計算，讓報價流程更順暢',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/50',
  },
  {
    icon: Calculator,
    title: '財務會計',
    description: '智能記帳、財務報表、稅務計算，一站式財務管理解決方案',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
  {
    icon: BarChart3,
    title: '數據分析',
    description: '實時儀表板、銷售趨勢分析，助您做出明智商業決策',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/50',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '銀行級加密、定期備份、符合法規，保護您的數據安全',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  {
    icon: Zap,
    title: '高效自動化',
    description: '自動化工作流程、減少人工錯誤，提升團隊生產力',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
  },
  {
    icon: Users,
    title: '團隊協作',
    description: '角色權限管理、即時同步，讓團隊合作更無縫',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/50',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
            功能特色
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            為什麼選擇我們
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            完整的業務管理工具集，幫助您提升效率、降低成本
          </p>
        </div>

        {/* 功能卡片網格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-300 cursor-pointer"
              >
                {/* 圖標 */}
                <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${feature.color}`} />
                </div>

                {/* 標題 */}
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>

                {/* 描述 */}
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover 裝飾 */}
                <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )
          })}
        </div>

        {/* 底部 CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            還有更多強大功能等您探索
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
          >
            查看所有功能與價格 →
          </a>
        </div>
      </div>
    </section>
  )
}
