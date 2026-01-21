import Link from 'next/link'
import { Check } from 'lucide-react'

const previewPlans = [
  {
    name: '入門版',
    description: '適合剛起步的小型團隊',
    price: { monthly: 299, yearly: 2990 },
    features: ['10 份報價單/月', '基本財務報表', 'Email 支援'],
  },
  {
    name: '標準版',
    description: '適合成長中的企業',
    price: { monthly: 599, yearly: 5990 },
    features: ['無限報價單', '進階分析', '優先支援', '自定義範本'],
    popular: true,
  },
  {
    name: '專業版',
    description: '適合大型團隊',
    price: { monthly: 1299, yearly: 12990 },
    features: ['所有功能', 'API 存取', '專屬客服', 'SLA 保證'],
  },
]

export function PricingPreview() {
  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            選擇適合您的方案
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            從免費開始，隨時升級
          </p>
        </div>

        {/* 簡化版方案卡片 */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {previewPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border-2 bg-white dark:bg-gray-800 transition-all hover:shadow-lg ${
                plan.popular
                  ? 'border-primary shadow-md scale-105'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-primary text-white text-sm font-medium">
                    最受歡迎
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    NT$ {plan.price.monthly.toLocaleString()}
                  </span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  年繳 NT$ {plan.price.yearly.toLocaleString()}（省 17%）
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/pricing"
                className={`block w-full py-3 rounded-lg text-center font-medium transition-colors ${
                  plan.popular
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                選擇方案
              </Link>
            </div>
          ))}
        </div>

        {/* 底部連結 */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            查看完整功能比較
            <span className="text-xl">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
