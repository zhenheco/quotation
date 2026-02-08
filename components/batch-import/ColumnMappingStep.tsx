'use client'

import { useMemo, useCallback } from 'react'
import { AlertCircle, Check, RefreshCw } from 'lucide-react'
import type { ColumnMapping, ImportResourceType } from '@/lib/services/batch-import/types'
import { getColumnsForResource, getRequiredColumns } from '@/lib/services/batch-import/template-columns'

interface ColumnMappingStepProps {
  /** 用戶 Excel 的原始資料（用於預覽第一筆） */
  rawData: Record<string, unknown>[]
  /** 自動匹配的結果 */
  mappings: ColumnMapping[]
  /** 資源類型 */
  resourceType: ImportResourceType
  /** 當 mapping 變更時觸發 */
  onMappingsChange: (mappings: ColumnMapping[]) => void
}

/** 取得 mapping 的狀態標記 */
function getMappingBadge(mapping: ColumnMapping) {
  if (!mapping.targetKey) return null
  if (mapping.confidence === 1.0 && mapping.autoMatched) {
    return <span title="精確匹配"><Check className="h-4 w-4 text-emerald-500" /></span>
  }
  if (mapping.autoMatched) {
    return <span title="自動猜測（可修改）"><RefreshCw className="h-4 w-4 text-amber-500" /></span>
  }
  return <span title="手動設定"><Check className="h-4 w-4 text-blue-500" /></span>
}

export default function ColumnMappingStep({
  rawData,
  mappings,
  resourceType,
  onMappingsChange,
}: ColumnMappingStepProps) {
  const columns = useMemo(() => getColumnsForResource(resourceType), [resourceType])
  const requiredColumns = useMemo(() => getRequiredColumns(resourceType), [resourceType])

  // 第一筆資料用於預覽
  const firstRow = rawData[0] || {}

  // 取得已使用的 targetKey（排除當前正在編輯的）
  const getUsedTargetKeys = useCallback(
    (excludeSource?: string) => {
      const used = new Set<string>()
      for (const m of mappings) {
        if (m.targetKey && m.sourceColumn !== excludeSource) {
          used.add(m.targetKey)
        }
      }
      return used
    },
    [mappings]
  )

  // 檢查必填欄位是否都已對應
  const unmappedRequired = useMemo(() => {
    const mappedKeys = new Set(mappings.filter((m) => m.targetKey).map((m) => m.targetKey))
    return requiredColumns.filter((col) => !mappedKeys.has(col.key))
  }, [mappings, requiredColumns])

  /** 更新單一欄位的對應 */
  const handleMappingChange = useCallback(
    (sourceColumn: string, targetKey: string | null) => {
      const updated = mappings.map((m) => {
        if (m.sourceColumn === sourceColumn) {
          return {
            ...m,
            targetKey: targetKey === '' ? null : targetKey,
            autoMatched: false,
            confidence: targetKey ? 1.0 : 0,
          }
        }
        return m
      })
      onMappingsChange(updated)
    },
    [mappings, onMappingsChange]
  )

  return (
    <div className="space-y-6">
      {/* 說明提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-1">欄位對應</h3>
        <p className="text-sm text-blue-700">
          系統已自動猜測欄位對應，請確認或修改對應關係。標示 <Check className="inline h-3.5 w-3.5 text-emerald-500" /> 為精確匹配，
          <RefreshCw className="inline h-3.5 w-3.5 text-amber-500" /> 為自動猜測（建議確認）。
        </p>
      </div>

      {/* 必填警示 */}
      {unmappedRequired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">必填欄位尚未對應</p>
            <p className="text-sm text-red-700 mt-1">
              以下必填欄位尚未設定對應：
              {unmappedRequired.map((col) => (
                <span key={col.key} className="inline-block bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-medium ml-1">
                  {col.header.replace(' *', '')}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* 對應表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700 border-b w-1/4">
                您的欄位
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 border-b w-1/4">
                預覽資料
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700 border-b w-8">
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 border-b w-1/3">
                對應到系統欄位
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-700 border-b w-8">
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => {
              const usedKeys = getUsedTargetKeys(mapping.sourceColumn)
              const previewValue = firstRow[mapping.sourceColumn]
              const displayValue = previewValue != null ? String(previewValue) : ''

              return (
                <tr key={mapping.sourceColumn} className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{mapping.sourceColumn}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-500 text-xs truncate block max-w-[200px]" title={displayValue}>
                      {displayValue || <span className="italic text-gray-300">（空）</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-400">
                    →
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={mapping.targetKey || ''}
                      onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value || null)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        mapping.targetKey
                          ? 'border-gray-300 text-gray-900'
                          : 'border-gray-200 text-gray-400'
                      }`}
                    >
                      <option value="">-- 不匯入 --</option>
                      {columns.map((col) => {
                        const isUsed = usedKeys.has(col.key)
                        return (
                          <option
                            key={col.key}
                            value={col.key}
                            disabled={isUsed}
                          >
                            {col.header.replace(' *', '')}
                            {col.required ? ' (必填)' : ''}
                            {isUsed ? ' (已使用)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getMappingBadge(mapping)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 統計 */}
      <div className="text-sm text-gray-500 text-center">
        共 {mappings.length} 個欄位，
        已對應 {mappings.filter((m) => m.targetKey).length} 個，
        不匯入 {mappings.filter((m) => !m.targetKey).length} 個
      </div>

    </div>
  )
}
