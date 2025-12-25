'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  isLoading?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  isLoading = false,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 按 ESC 鍵關閉對話框
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

  // 確保在客戶端渲染
  if (!mounted || !isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* 背景遮罩 - 毛玻璃效果 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />

      {/* 對話框內容 - 現代圓潤設計 */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl animate-scale-in"
        style={{
          position: 'relative',
          zIndex: 10000,
          backgroundColor: 'white',
          width: '360px',
          maxWidth: '90vw'
        }}
      >
        <div className="p-6">
          {/* 圖標區 - 漸層背景 */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-red-50">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* 文字區 */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {title}
            </h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>

          {/* 按鈕區 - 垂直排列 */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="w-full px-6 py-3 bg-red-500 text-white rounded-2xl font-medium shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '刪除中...' : confirmText}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-medium hover:bg-slate-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // 使用 Portal 渲染到 body，確保對話框顯示在最上層
  return typeof window !== 'undefined' && mounted
    ? createPortal(modalContent, document.body)
    : null
}
