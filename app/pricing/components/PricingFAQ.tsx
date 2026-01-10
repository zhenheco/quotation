'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '我可以隨時升級或降級嗎？',
    answer:
      '是的，您可以隨時升級至更高的方案，升級立即生效，系統會按比例計算剩餘天數的差額。降級則會在當前計費週期結束後生效，您可以繼續使用原方案功能直到週期結束。',
  },
  {
    question: '年繳方案可以退款嗎？',
    answer:
      '年繳方案在購買後 14 天內可申請全額退款。超過 14 天若需取消，將按已使用月份計算，退還剩餘月份的費用（扣除 10% 手續費）。',
  },
  {
    question: 'AI 分析功能有使用限制嗎？',
    answer:
      '是的，專業版的 AI 功能有每月使用次數限制：現金流分析每月 20 次、應收風險分析每月 10 次、稅務優化建議每月 5 次。如需更多使用量，請聯繫客服了解企業方案。',
  },
  {
    question: '如何取消訂閱？',
    answer:
      '您可以在「設定」>「訂閱管理」頁面隨時取消訂閱。取消後，您的帳戶將在當前計費週期結束後自動降級為免費版，資料不會被刪除，但會受到免費版功能限制。',
  },
  {
    question: '支援哪些付款方式？',
    answer:
      '我們透過 PAYUNi 統一金流支援多種付款方式，包括：信用卡（VISA、MasterCard、JCB）、虛擬帳號轉帳、超商代碼繳費等。企業客戶也可選擇銀行匯款。',
  },
  {
    question: '多間公司功能如何運作？',
    answer:
      '標準版支援管理 3 間公司，專業版支援 10 間。每間公司都有獨立的資料空間，您可以在頂部選單快速切換公司。所有公司共用同一個訂閱方案的功能配額。',
  },
  {
    question: '免費版有什麼限制？',
    answer:
      '免費版適合小型試用，限制包括：最多 50 個產品、20 個客戶、每月 10 份報價單，以及僅能使用基本報表功能。若需營業稅、營所稅等稅務功能，需升級至入門版或以上方案。',
  },
  {
    question: '推薦計劃如何運作？',
    answer:
      '成功推薦朋友註冊並訂閱付費方案後，您可獲得該訂單金額的 10% 作為佣金。被推薦者首月可享 50% 折扣。佣金每月結算，累積滿 NT$500 即可申請提領。',
  },
]

/**
 * 定價頁面 FAQ 區塊
 */
export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="container mx-auto px-4 py-12">
      {/* 標題 */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <HelpCircle className="h-6 w-6 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">常見問題</h2>
        <p className="mt-2 text-muted-foreground">
          還有其他問題？歡迎
          <a href="/contact" className="text-primary hover:underline">
            聯繫我們
          </a>
        </p>
      </div>

      {/* FAQ 列表 */}
      <div className="mx-auto max-w-3xl space-y-4">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index

          return (
            <div
              key={index}
              className={cn(
                'overflow-hidden rounded-2xl border transition-all duration-200',
                isOpen
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-slate-200'
              )}
            >
              {/* 問題（按鈕） */}
              <button
                onClick={() => toggleItem(index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 text-base font-medium text-foreground">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180 text-primary'
                  )}
                />
              </button>

              {/* 答案 */}
              <div
                className={cn(
                  'grid transition-all duration-200',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
