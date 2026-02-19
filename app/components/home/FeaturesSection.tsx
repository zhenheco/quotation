import { FileText, TrendingUp, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: '以前報稅季我都加班到凌晨整理發票，現在系統幫我把數據整理好，五點準時下班。',
    name: '小華',
    role: '新創公司財務',
    avatar: '華',
    avatarColor: 'from-blue-500 to-blue-600',
  },
  {
    quote: '我們三個人的公司，不可能請一個專職會計。這個系統等於請了半個會計，一個月才幾百塊。',
    name: '阿凱',
    role: '電商創業者',
    avatar: '凱',
    avatarColor: 'from-indigo-500 to-indigo-600',
  },
]

export function FeaturesSection() {
  return (
    <section className="relative overflow-hidden">
      {/* 平行宇宙轉折段 */}
      <div className="relative">
        {/* 灰色（痛苦）半邊 */}
        <div className="bg-slate-100 dark:bg-slate-900 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-mono mb-6">
              晚上 8:00
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-400 dark:text-slate-500 mb-4 leading-tight">
              你還在公司，<br />
              對著螢幕上的 Excel 嘆第 17 口氣。
            </h2>
            <p className="text-slate-400 dark:text-slate-600 text-lg">
              報價單改了三版、訂單資料手動複製到一半、出貨單地址還沒確認...
            </p>
          </div>
        </div>

        {/* 撕裂分隔線 */}
        <div className="relative h-20 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent to-teal-400" />
              <span className="text-teal-600 dark:text-teal-400 font-bold text-lg md:text-xl whitespace-nowrap">
                但如果——
              </span>
              <div className="h-px w-16 md:w-32 bg-gradient-to-l from-transparent to-teal-400" />
            </div>
          </div>
        </div>

        {/* 明亮（解法）半邊 */}
        <div className="bg-white dark:bg-slate-950 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-mono mb-6">
              晚上 6:00
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
              你已經在家吃飯了。
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              報價單早上就寄出了，客戶回覆 OK 後訂單自動建好了，<br className="hidden md:block" />
              出貨單明天上班按一個鍵就搞定。
            </p>

            {/* 功能數字（小字補充） */}
            <div className="flex flex-wrap justify-center gap-8 mt-10">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/50 mx-auto mb-2">
                  <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">50,000+</div>
                <div className="text-xs text-slate-500">份報價單已產生</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">500+</div>
                <div className="text-xs text-slate-500">企業正在使用</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 社會認證段 */}
      <div className="bg-slate-50 dark:bg-slate-900 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              他們的星期一，已經不一樣了
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Quote className="absolute top-4 right-4 w-8 h-8 text-slate-100 dark:text-slate-700" />
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-5 relative z-10">
                  「{t.quote}」
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
