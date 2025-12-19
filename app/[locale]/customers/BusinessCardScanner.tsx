'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { BusinessCardData } from '@/lib/services/business-card-ocr'

interface BusinessCardScannerProps {
  onScanComplete: (data: BusinessCardData) => void
  disabled?: boolean
}

// 圖片壓縮設定
const MAX_IMAGE_SIZE = 1024 * 1024 // 1MB
const MAX_IMAGE_DIMENSION = 1920 // 最大邊長

/**
 * 名片掃描按鈕組件
 * 支援拍照和選擇圖片，自動壓縮後上傳進行 OCR
 */
export default function BusinessCardScanner({ onScanComplete, disabled }: BusinessCardScannerProps) {
  const t = useTranslations('businessCard')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isScanning, setIsScanning] = useState(false)

  /**
   * 壓縮圖片
   */
  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // 計算縮放比例
          let { width, height } = img
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          // 建立 canvas 進行壓縮
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('無法建立 canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // 嘗試不同品質直到符合大小限制
          let quality = 0.9
          let base64 = canvas.toDataURL('image/jpeg', quality)

          while (base64.length > MAX_IMAGE_SIZE * 1.37 && quality > 0.1) {
            quality -= 0.1
            base64 = canvas.toDataURL('image/jpeg', quality)
          }

          // 移除 data URL 前綴
          const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
          resolve(base64Data)
        }
        img.onerror = () => reject(new Error('無法載入圖片'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('無法讀取檔案'))
      reader.readAsDataURL(file)
    })
  }, [])

  /**
   * 處理檔案選擇
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案類型
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidFileType'))
      return
    }

    setIsScanning(true)

    try {
      // 壓縮圖片
      const imageBase64 = await compressImage(file)

      // 呼叫 OCR API
      const response = await fetch('/api/ocr/business-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
      })

      const result = await response.json() as { success: boolean; data?: BusinessCardData; error?: string }

      if (!result.success) {
        throw new Error(result.error || t('scanFailed'))
      }

      if (result.data) {
        onScanComplete(result.data)
        toast.success(t('scanSuccess'))
      } else {
        toast.warning(t('noResults'))
      }

    } catch (error) {
      console.error('名片掃描失敗:', error)
      toast.error(error instanceof Error ? error.message : t('scanFailed'))
    } finally {
      setIsScanning(false)
      // 清除 input 以便重複選擇同一檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [compressImage, onScanComplete, t])

  /**
   * 觸發檔案選擇
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="mb-4">
      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isScanning}
      />

      {/* 掃描按鈕 */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isScanning}
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isScanning ? (
          <>
            {/* 載入動畫 */}
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t('scanning')}</span>
          </>
        ) : (
          <>
            {/* 相機圖標 */}
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span>{t('scan')}</span>
          </>
        )}
      </button>

      <p className="mt-1 text-xs text-gray-500">{t('hint')}</p>
    </div>
  )
}
