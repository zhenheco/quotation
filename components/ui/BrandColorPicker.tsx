'use client'

import { useState } from 'react'
import type { BrandColors, BrandColorPreset } from '@/types/brand.types'
import { BRAND_COLOR_PRESETS, DEFAULT_BRAND_COLORS } from '@/types/brand.types'

interface BrandColorPickerProps {
  value: BrandColors
  onChange: (colors: BrandColors) => void
  locale: string
}

export function BrandColorPicker({ value, onChange, locale }: BrandColorPickerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const isZh = locale === 'zh'

  const isPresetSelected = (preset: BrandColorPreset): boolean => {
    return (
      value.primary === preset.colors.primary &&
      value.secondary === preset.colors.secondary &&
      value.text === preset.colors.text
    )
  }

  const handlePresetSelect = (preset: BrandColorPreset) => {
    onChange(preset.colors)
  }

  const handleColorChange = (key: keyof BrandColors, color: string) => {
    onChange({ ...value, [key]: color })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {BRAND_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetSelect(preset)}
            className={`p-3 rounded-lg border-2 transition-all ${
              isPresetSelected(preset)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: preset.colors.primary }}
              />
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: preset.colors.secondary }}
              />
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: preset.colors.text }}
              />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {isZh ? preset.name.zh : preset.name.en}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        {showAdvanced
          ? (isZh ? '隱藏自訂顏色' : 'Hide custom colors')
          : (isZh ? '自訂顏色' : 'Custom colors')}
      </button>

      {showAdvanced && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600">
              {isZh ? '主色' : 'Primary'}
            </label>
            <input
              type="color"
              value={value.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={value.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="#4f46e5"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600">
              {isZh ? '次要色' : 'Secondary'}
            </label>
            <input
              type="color"
              value={value.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={value.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="#f3f4f6"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-600">
              {isZh ? '文字色' : 'Text'}
            </label>
            <input
              type="color"
              value={value.text}
              onChange={(e) => handleColorChange('text', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={value.text}
              onChange={(e) => handleColorChange('text', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="#111827"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_BRAND_COLORS)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isZh ? '重設為預設' : 'Reset to default'}
          </button>
        </div>
      )}

      <div className="p-4 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500 mb-2">
          {isZh ? '預覽效果' : 'Preview'}
        </p>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: value.secondary }}
        >
          <h3
            className="text-lg font-bold mb-2"
            style={{ color: value.primary }}
          >
            {isZh ? '報價單標題' : 'Quotation Title'}
          </h3>
          <p style={{ color: value.text }}>
            {isZh ? '這是報價單的內容文字範例。' : 'This is sample content text.'}
          </p>
          <div
            className="mt-3 px-4 py-2 rounded text-white text-sm inline-block"
            style={{ backgroundColor: value.primary }}
          >
            {isZh ? '按鈕範例' : 'Button Example'}
          </div>
        </div>
      </div>
    </div>
  )
}
