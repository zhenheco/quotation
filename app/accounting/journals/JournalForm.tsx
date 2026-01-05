'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCreateJournal } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusCircle, Trash2 } from 'lucide-react'
import type { CreateJournalRequest } from '@/lib/services/accounting/journal.service'

interface TransactionLine {
  id: string
  accountId: string
  description: string
  debit: string
  credit: string
}

// 共用 input 樣式
const inputClassName = 'block w-full px-3 py-2 text-sm border rounded-lg bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 border-slate-200'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

/**
 * 傳票新增表單
 * 會計傳票需要包含至少一筆分錄，且借貸必須平衡
 */
export default function JournalForm() {
  const router = useRouter()
  const { company } = useCompany()
  const createJournal = useCreateJournal()

  // 表單狀態
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [transactions, setTransactions] = useState<TransactionLine[]>([
    { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
    { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
  ])

  // 新增分錄行
  const addLine = useCallback(() => {
    setTransactions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
    ])
  }, [])

  // 刪除分錄行
  const removeLine = useCallback((id: string) => {
    setTransactions((prev) => {
      if (prev.length <= 2) {
        toast.error('至少需要兩筆分錄')
        return prev
      }
      return prev.filter((line) => line.id !== id)
    })
  }, [])

  // 更新分錄行
  const updateLine = useCallback((id: string, field: keyof TransactionLine, value: string) => {
    setTransactions((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line

        // 借方有值時清空貸方，反之亦然
        if (field === 'debit' && value) {
          return { ...line, debit: value, credit: '' }
        }
        if (field === 'credit' && value) {
          return { ...line, credit: value, debit: '' }
        }

        return { ...line, [field]: value }
      })
    )
  }, [])

  // 計算借貸合計
  const totals = transactions.reduce(
    (acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0),
    }),
    { debit: 0, credit: 0 }
  )

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!company?.id) {
      toast.error('請先選擇公司')
      return
    }

    // 驗證借貸平衡
    if (!isBalanced) {
      toast.error('借貸不平衡')
      return
    }

    // 驗證至少有一筆有效分錄
    const validTransactions = transactions.filter(
      (tx) => tx.accountId.trim() && (parseFloat(tx.debit) > 0 || parseFloat(tx.credit) > 0)
    )

    if (validTransactions.length < 2) {
      toast.error('至少需要兩筆分錄')
      return
    }

    try {
      const input: CreateJournalRequest = {
        company_id: company.id,
        date,
        description: description.trim() || undefined,
        source_type: 'MANUAL',
        transactions: validTransactions.map((tx) => ({
          account_id: tx.accountId.trim(),
          description: tx.description.trim() || undefined,
          debit: parseFloat(tx.debit) || 0,
          credit: parseFloat(tx.credit) || 0,
        })),
      }

      await createJournal.mutateAsync(input)
      toast.success('傳票建立成功')
      router.push('/accounting/journals')
    } catch (error) {
      console.error('Error creating journal:', error)
      const message = error instanceof Error ? error.message : '傳票建立失敗'
      toast.error(message)
    }
  }

  const isSubmitting = createJournal.isPending

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">傳票資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={labelClassName}>
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClassName}>
                摘要
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="請輸入摘要說明"
                className={inputClassName}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分錄明細 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">分錄明細</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <PlusCircle className="h-4 w-4 mr-1" />
            新增分錄
          </Button>
        </CardHeader>
        <CardContent>
          {/* 表頭 */}
          <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">會計科目代碼</div>
            <div className="col-span-4">說明</div>
            <div className="col-span-2 text-right">借方</div>
            <div className="col-span-2 text-right">貸方</div>
            <div className="col-span-1"></div>
          </div>

          {/* 分錄行 */}
          {transactions.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-3">
                <input
                  type="text"
                  value={line.accountId}
                  onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                  placeholder="1101"
                  className={inputClassName}
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                  placeholder="分錄說明"
                  className={inputClassName}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={line.debit}
                  onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                  placeholder="0"
                  className={`${inputClassName} text-right`}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={line.credit}
                  onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                  placeholder="0"
                  className={`${inputClassName} text-right`}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(line.id)}
                  disabled={transactions.length <= 2}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          {/* 合計 */}
          <div className="grid grid-cols-12 gap-2 mt-4 pt-4 border-t">
            <div className="col-span-7 text-right font-medium">合計</div>
            <div className="col-span-2 text-right font-medium">
              {totals.debit.toLocaleString('zh-TW')}
            </div>
            <div className="col-span-2 text-right font-medium">
              {totals.credit.toLocaleString('zh-TW')}
            </div>
            <div className="col-span-1"></div>
          </div>

          {/* 平衡狀態 */}
          {!isBalanced && (
            <div className="mt-2 text-sm text-destructive text-right">
              借貸不平衡: {Math.abs(totals.debit - totals.credit).toLocaleString('zh-TW')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/accounting/journals')}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting || !isBalanced}>
          {isSubmitting ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </form>
  )
}
