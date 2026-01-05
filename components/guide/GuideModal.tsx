'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import GuideModalContent from './GuideModalContent'

interface GuideModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 教學 Modal 容器
 * 使用 createPortal 渲染到 body，支援 ESC/背景點擊關閉
 * 桌面版保持側欄可見（Modal 從左側 72/288px 開始）
 */
export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // 防止背景滾動
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9998] md:left-20"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      {/* 遮罩層 - 毛玻璃效果 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal 主體 */}
      <div className="relative flex h-full items-center justify-center p-4 md:p-6">
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 頂部標題列 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <h2
              id="guide-modal-title"
              className="text-xl font-semibold text-slate-800"
            >
              📚 使用教學
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm hover:shadow"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 內容區 */}
          <div className="h-[calc(100%-72px)] overflow-y-auto">
            <GuideModalContent onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  )

  return typeof window !== 'undefined' && mounted
    ? createPortal(modalContent, document.body)
    : null
}
