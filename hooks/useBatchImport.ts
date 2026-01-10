/**
 * 批量匯入 Hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ImportResourceType,
  DuplicateHandling,
  ImportResult,
  BatchImportResponse,
} from '@/lib/services/batch-import/types'

interface BatchImportParams {
  resourceType: ImportResourceType
  data: Record<string, unknown>[]
  companyId: string
  duplicateHandling: DuplicateHandling
}

/**
 * 執行批量匯入
 */
async function batchImport({
  resourceType,
  data,
  companyId,
  duplicateHandling,
}: BatchImportParams): Promise<ImportResult> {
  const response = await fetch(`/api/batch-import/${resourceType}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      company_id: companyId,
      duplicateHandling,
    }),
  })

  const result: BatchImportResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '匯入失敗')
  }

  if (!result.result) {
    throw new Error('匯入結果為空')
  }

  return result.result
}

/**
 * 批量匯入 Hook
 */
export function useBatchImport(resourceType: ImportResourceType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: Omit<BatchImportParams, 'resourceType'>) =>
      batchImport({ ...params, resourceType }),
    onSuccess: () => {
      // 重新獲取相關資料
      queryClient.invalidateQueries({ queryKey: [resourceType] })
    },
  })
}

/**
 * 下載範本
 */
export function downloadTemplate(
  resourceType: ImportResourceType,
  format: 'xlsx' | 'csv'
): void {
  const filename = `${resourceType.slice(0, -1)}-import-template.${format}`
  const link = document.createElement('a')
  link.href = `/templates/${filename}`
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
