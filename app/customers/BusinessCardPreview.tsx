'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BusinessCardData } from '@/lib/services/business-card-ocr'

/**
 * 表單欄位映射結果
 */
export interface BusinessCardFormData {
  nameZh: string
  nameEn: string
  email: string
  phone: string
  fax: string
  addressZh: string
  addressEn: string
  company?: string
  title?: string
}

interface BusinessCardPreviewProps {
  data: BusinessCardData
  isOpen: boolean
  onConfirm: (formData: BusinessCardFormData) => void
  onCancel: () => void
}

/**
 * 名片識別結果預覽對話框
 * 讓用戶確認/修改識別結果後再填入表單
 */
export default function BusinessCardPreview({
  data,
  isOpen,
  onConfirm,
  onCancel,
}: BusinessCardPreviewProps) {

  // 可編輯的預覽資料
  const [previewData, setPreviewData] = useState<BusinessCardFormData>({
    nameZh: '',
    nameEn: '',
    email: '',
    phone: '',
    fax: '',
    addressZh: '',
    addressEn: '',
    company: '',
    title: '',
  })

  // 當對話框開啟或資料變化時，初始化預覽資料
  useEffect(() => {
    if (isOpen && data) {
      setPreviewData({
        nameZh: data.name?.zh || '',
        nameEn: data.name?.en || '',
        email: data.email || '',
        phone: data.phone || '',
        fax: data.fax || '',
        addressZh: data.address?.zh || '',
        addressEn: data.address?.en || '',
        company: data.company || '',
        title: data.title || '',
      })
    }
  }, [isOpen, data])

  /**
   * 更新單一欄位
   */
  const handleFieldChange = useCallback((field: keyof BusinessCardFormData, value: string) => {
    setPreviewData(prev => ({ ...prev, [field]: value }))
  }, [])

  /**
   * 確認並填入表單
   */
  const handleConfirm = useCallback(() => {
    onConfirm(previewData)
  }, [onConfirm, previewData])

  // 如果未開啟，不渲染
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      />

      {/* 對話框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
          {/* 標題 */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              名片識別結果
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              請確認識別結果，可修改後填入表單
            </p>
          </div>

          {/* 內容 */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {/* 姓名 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    姓名 (中文)
                  </label>
                  <input
                    type="text"
                    value={previewData.nameZh}
                    onChange={(e) => handleFieldChange('nameZh', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="中文姓名"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    姓名 (English)
                  </label>
                  <input
                    type="text"
                    value={previewData.nameEn}
                    onChange={(e) => handleFieldChange('nameEn', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="English Name"
                  />
                </div>
              </div>

              {/* 公司 & 職稱（僅供參考，不填入客戶表單） */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    公司 <span className="text-gray-400">(僅供參考)</span>
                  </label>
                  <input
                    type="text"
                    value={previewData.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                    placeholder="公司名稱"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    職稱 <span className="text-gray-400">(僅供參考)</span>
                  </label>
                  <input
                    type="text"
                    value={previewData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                    placeholder="職稱"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  電子郵件
                </label>
                <input
                  type="email"
                  value={previewData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="email@example.com"
                />
              </div>

              {/* 電話 & 傳真 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    電話
                  </label>
                  <input
                    type="tel"
                    value={previewData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+886-2-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    傳真
                  </label>
                  <input
                    type="tel"
                    value={previewData.fax}
                    onChange={(e) => handleFieldChange('fax', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="+886-2-1234-5679"
                  />
                </div>
              </div>

              {/* 地址 */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    地址 (中文)
                  </label>
                  <textarea
                    value={previewData.addressZh}
                    onChange={(e) => handleFieldChange('addressZh', e.target.value)}
                    rows={2}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="中文地址"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    地址 (English)
                  </label>
                  <textarea
                    value={previewData.addressEn}
                    onChange={(e) => handleFieldChange('addressEn', e.target.value)}
                    rows={2}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="English Address"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              確認填入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
