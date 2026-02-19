import { FileText, ClipboardList, Truck, Calculator } from 'lucide-react'

const SOLVE_COLOR = 'border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20'

const ACTS = [
  {
    time: '9:30 AM',
    icon: FileText,
    painTitle: '做報價',
    painText: '「Excel 範本格式又跑掉了，稅額公式被誰改過了？花了 30 分鐘，才做好一份報價單。」',
    solveText: '選好品項、填入數量，系統自動計算稅額，一鍵產生 PDF 寄給客戶。5 分鐘搞定。',
    painColor: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
  },
  {
    time: '11:00 AM',
    icon: ClipboardList,
    painTitle: '轉訂單',
    painText: '「客戶回覆 OK 了！但我得把報價單的資料，一行一行複製到另一張訂單表格裡...」',
    solveText: '報價單一鍵轉訂單，品項、數量、價格、客戶資料全部自動帶入，零手動輸入。',
    painColor: 'border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
  },
  {
    time: '2:00 PM',
    icon: Truck,
    painTitle: '出貨',
    painText: '「出貨地址到底是哪個版本的？收件人電話上次就抄錯了一碼，包裹退回來...」',
    solveText: '訂單直接轉出貨單，收件人姓名、電話、地址從客戶資料自動帶入，不再手抄出錯。',
    painColor: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
  },
  {
    time: '5:00 PM',
    icon: Calculator,
    painTitle: '報稅',
    painText: '「報稅截止剩 3 天，桌上一疊發票還沒 key 進去，今晚又要加班了...」',
    solveText: '所有交易數據即時彙整，營業稅、營所稅自動計算，報稅季不再手忙腳亂。',
    painColor: 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
]

export function PainPointsSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4">
        {/* 段落標題 */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
            一個老闆的星期一
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            看起來很熟悉嗎？往下滾。
          </p>
        </div>

        {/* 時間軸 */}
        <div className="relative">
          {/* 垂直線 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

          <div className="space-y-16 md:space-y-20">
            {ACTS.map((act, index) => {
              const Icon = act.icon
              const isEven = index % 2 === 0

              return (
                <div key={act.time} className="relative">
                  {/* 時間節點（桌面版） */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 -top-3 z-10">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className={`w-6 h-6 rounded-full ${act.iconBg} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                      </div>
                      <span className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">{act.time}</span>
                    </div>
                  </div>

                  {/* 手機版時間標籤 */}
                  <div className="md:hidden flex items-center gap-2 mb-4">
                    <div className={`w-8 h-8 rounded-full ${act.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${act.iconColor}`} />
                    </div>
                    <span className="text-sm font-mono font-medium text-slate-600 dark:text-slate-400">{act.time}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{act.painTitle}</span>
                  </div>

                  {/* 內容：桌面版左右交替，手機版上下排列 */}
                  <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                    {/* 痛苦面 */}
                    <div className={`${isEven ? 'md:order-1' : 'md:order-2'} ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                      <div className={`rounded-xl border ${act.painColor} p-5`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-400 text-lg">😩</span>
                          <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">沒有系統的時候</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
                          {act.painText}
                        </p>
                      </div>
                    </div>

                    {/* 解法面 */}
                    <div className={`${isEven ? 'md:order-2' : 'md:order-1'} ${isEven ? 'md:pl-12' : 'md:pr-12'}`}>
                      <div className={`rounded-xl border ${SOLVE_COLOR} p-5`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-teal-500 text-lg">✨</span>
                          <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">用 Quote24 之後</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                          {act.solveText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
