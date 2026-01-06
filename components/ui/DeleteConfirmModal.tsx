'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

export interface RelatedRecordsInfo {
  hasRelatedRecords: boolean
  payments?: { id: string; amount: number; payment_date?: string }[]
  schedules?: { id: string; amount: number; due_date?: string; status?: string }[]
  quotations?: { id: string; quotation_number?: string; total_amount?: number; status?: string }[]
  totalPaymentsAmount?: number
  totalSchedulesAmount?: number
  totalQuotationsAmount?: number
}

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (forceDelete?: boolean) => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  isLoading?: boolean
  // 擴展功能：顯示關聯紀錄
  relatedRecords?: RelatedRecordsInfo
  forceDeleteLabel?: string
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
  relatedRecords,
  forceDeleteLabel = '連同刪除所有關聯的付款紀錄',
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  // 重置 forceDelete 狀態當 modal 關閉時
  useEffect(() => {
    if (!isOpen) {
      setForceDelete(false)
    }
  }, [isOpen])

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

          {/* 關聯紀錄資訊 */}
          {relatedRecords?.hasRelatedRecords && (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-amber-800">
                  此紀錄有以下關聯資料：
                </span>
              </div>
              <ul className="space-y-1.5 text-sm text-amber-700 ml-7">
                {relatedRecords.payments && relatedRecords.payments.length > 0 && (
                  <li>
                    • {relatedRecords.payments.length} 筆收款紀錄
                    {relatedRecords.totalPaymentsAmount !== undefined && (
                      <span className="ml-1">
                        （共 NT${relatedRecords.totalPaymentsAmount.toLocaleString()}）
                      </span>
                    )}
                  </li>
                )}
                {relatedRecords.schedules && relatedRecords.schedules.length > 0 && (
                  <li>
                    • {relatedRecords.schedules.length} 筆付款排程
                    {relatedRecords.totalSchedulesAmount !== undefined && (
                      <span className="ml-1">
                        （共 NT${relatedRecords.totalSchedulesAmount.toLocaleString()}）
                      </span>
                    )}
                  </li>
                )}
                {relatedRecords.quotations && relatedRecords.quotations.length > 0 && (
                  <li>
                    • {relatedRecords.quotations.length} 筆報價單
                    {relatedRecords.totalQuotationsAmount !== undefined && (
                      <span className="ml-1">
                        （共 NT${relatedRecords.totalQuotationsAmount.toLocaleString()}）
                      </span>
                    )}
                  </li>
                )}
              </ul>

              {/* 強制刪除選項 */}
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-amber-800">{forceDeleteLabel}</span>
              </label>
            </div>
          )}

          {/* 按鈕區 - 垂直排列 */}
          <div className="flex flex-col gap-3">
            {/* 有關聯紀錄但未勾選時顯示提示 */}
            {relatedRecords?.hasRelatedRecords && !forceDelete && (
              <p className="text-xs text-center text-red-500 mb-1">
                請勾選上方選項以刪除關聯紀錄，否則無法刪除
              </p>
            )}
            <button
              type="button"
              disabled={isLoading || (relatedRecords?.hasRelatedRecords && !forceDelete)}
              onClick={() => onConfirm(forceDelete)}
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
