import { FileText, Calculator, BarChart3, Shield, Zap, Users } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: '報價單管理',
    description: '專業範本庫、快速產生 PDF、自動化計算，讓報僞流程更順暢',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    icon: Calculator,
    title: '財務會計',
    description: '智能記帳、財務報表、稅務計算，一站式財務管理解決方案',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  {
    icon: BarChart3,
    title: '數據分析',
    description: '實時儀表板、銷售趨勢分析，助您做出明智商業決策',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '銀行級加密、定期備份、符合法規，保護您的數據安全',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
  {
    icon: Zap,
    title: '高效自動化',
    description: '自動化工作流程、減少人工錯誤，提升團隊生產力',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    icon: Users,
    title: '團隊協作',
    description: '角色權限管理、即時同步，讓團隊合作更無縫',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            為什麼選擇我們
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            完整的業務管理工具集，幫助您提升效率、降低成本
          </p>
        </div>

        {/* 功能卡片網格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-300"
              >
                {/* 圖標 */}
                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>

                {/* 標題 */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>

                {/* 描述 */}
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover 裝飾 */}
                <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )
          })}
        </div>

        {/* 底部 CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            還有更多強大功能等您探索
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center text-primary hover:underline font-medium"
          >
            查看所有功能 →
          </a>
        </div>
      </div>
    </section>
  )
}
