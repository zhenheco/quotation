'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { guideCategories, getCategoryInfo, type GuideCategory } from './guide-data'
import GuideStepCard from './GuideStepCard'

interface GuideModalContentProps {
  onClose?: () => void
}

/**
 * 教學 Modal 內容
 * 兩種視圖：類別選擇 / 步驟導覽
 */
export default function GuideModalContent({ onClose }: GuideModalContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // 取得當前類別資訊
  const categoryInfo = selectedCategory ? getCategoryInfo(selectedCategory) : null

  // 處理類別選擇
  const handleSelectCategory = (category: GuideCategory) => {
    setSelectedCategory(category)
    setCurrentStep(0)
  }

  // 返回類別選擇
  const handleBack = () => {
    setSelectedCategory(null)
    setCurrentStep(0)
  }

  // 上一步
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 下一步
  const handleNextStep = () => {
    if (categoryInfo && currentStep < categoryInfo.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 完成教學
  const handleComplete = () => {
    handleBack()
    if (onClose) {
      onClose()
    }
  }

  // 類別選擇視圖
  if (!selectedCategory) {
    return (
      <div className="p-6">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            選擇教學主題
          </h3>
          <p className="text-slate-500">
            選擇您想學習的功能，我們將一步一步引導您
          </p>
        </div>

        {/* 類別卡片 */}
        <div className="grid md:grid-cols-3 gap-6">
          {guideCategories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => handleSelectCategory(category.id)}
                className={cn(
                  'group text-left p-6 rounded-2xl border-2 border-transparent',
                  'bg-gradient-to-br from-white to-slate-50',
                  'hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10',
                  'transition-all duration-300',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                )}
              >
                {/* 圖示 */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                    'bg-gradient-to-br shadow-lg',
                    category.color,
                    'group-hover:scale-110 transition-transform duration-300'
                  )}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* 標題 */}
                <h4 className="text-lg font-semibold text-slate-800 mb-2">
                  {category.title.zh}
                </h4>

                {/* 描述 */}
                <p className="text-sm text-slate-500 mb-4">
                  {category.description.zh}
                </p>

                {/* 步驟數 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {category.steps.length} 個步驟
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 步驟導覽視圖
  if (!categoryInfo) return null

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === categoryInfo.steps.length - 1

  return (
    <div className="flex flex-col h-full">
      {/* 頂部導航 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>返回類別</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {categoryInfo.title}
          </span>
        </div>
      </div>

      {/* 進度條 */}
      <div className="px-6 py-3 bg-slate-50">
        <div className="flex items-center gap-2">
          {categoryInfo.steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-2 rounded-full transition-all duration-300',
                i < currentStep
                  ? 'bg-emerald-500'
                  : i === currentStep
                  ? 'bg-emerald-400'
                  : 'bg-slate-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* 步驟內容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <GuideStepCard
          step={categoryInfo.steps[currentStep]}
          stepNumber={currentStep + 1}
          totalSteps={categoryInfo.steps.length}
        />
      </div>

      {/* 底部導航按鈕 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
        <button
          onClick={handlePrevStep}
          disabled={isFirstStep}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
            isFirstStep
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>上一步</span>
        </button>

        {isLastStep ? (
          <button
            onClick={handleComplete}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium',
              'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
              'hover:from-emerald-600 hover:to-teal-700',
              'shadow-lg shadow-emerald-500/25 hover:shadow-xl',
              'transition-all duration-200'
            )}
          >
            <CheckCircle className="w-5 h-5" />
            <span>完成</span>
          </button>
        ) : (
          <button
            onClick={handleNextStep}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium',
              'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
              'hover:from-emerald-600 hover:to-teal-700',
              'shadow-lg shadow-emerald-500/25 hover:shadow-xl',
              'transition-all duration-200'
            )}
          >
            <span>下一步</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
