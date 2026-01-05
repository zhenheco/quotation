'use client'

import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideFABProps {
  onClick: () => void
}

/**
 * 教學浮動按鈕 (Floating Action Button)
 * 固定於右下角，點擊開啟教學 Modal
 */
export default function GuideFAB({ onClick }: GuideFABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // 固定位置：手機版避開底部導航，桌面版靠角落
        'fixed bottom-24 right-6 md:bottom-8',
        // z-index 低於 Modal (9998)，但高於一般內容
        'z-40',
        // 尺寸與形狀
        'flex h-14 w-14 items-center justify-center',
        'rounded-full',
        // 漸層背景
        'bg-gradient-to-br from-emerald-500 to-teal-600',
        'text-white shadow-lg shadow-emerald-500/30',
        // 互動效果
        'hover:from-emerald-600 hover:to-teal-700',
        'hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/40',
        'active:scale-95',
        'transition-all duration-200',
        // 無障礙
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
      )}
      title="開啟教學指南"
      aria-label="開啟教學指南"
    >
      <BookOpen className="h-6 w-6" />
    </button>
  )
}
