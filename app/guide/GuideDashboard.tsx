'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Receipt, Landmark, ChevronRight } from 'lucide-react'
import GuideModal from '@/components/guide/GuideModal'

// 教學類別
type GuideCategory = 'getting-started' | 'vat-filing' | 'income-tax'

// 類別資料
const categories: { id: GuideCategory; title: string; description: string; icon: React.ReactNode; steps: number }[] = [
  {
    id: 'getting-started',
    title: '新手導覽',
    description: '快速了解報價系統的基本功能',
    icon: <BookOpen className="h-8 w-8" />,
    steps: 4,
  },
  {
    id: 'vat-filing',
    title: '營業稅申報教學',
    description: '學習如何產生和申報雙月營業稅',
    icon: <Receipt className="h-8 w-8" />,
    steps: 5,
  },
  {
    id: 'income-tax',
    title: '營所稅申報教學',
    description: '學習如何使用擴大書審計算營所稅',
    icon: <Landmark className="h-8 w-8" />,
    steps: 5,
  },
]

/**
 * 教學儀表板
 * 顯示類別卡片，點擊後開啟 Modal 顯示步驟教學
 */
export default function GuideDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 標題區 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">教學指南</h1>
          <p className="text-muted-foreground mt-2">選擇一個主題開始學習</p>
        </div>

        {/* 類別卡片 */}
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-emerald-300"
              onClick={handleOpenModal}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                  {cat.icon}
                </div>
                <CardTitle className="text-lg">{cat.title}</CardTitle>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  {cat.steps} 個步驟
                </p>
                <Button variant="ghost" className="mt-4 gap-2">
                  開始學習
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 教學 Modal */}
      <GuideModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  )
}
