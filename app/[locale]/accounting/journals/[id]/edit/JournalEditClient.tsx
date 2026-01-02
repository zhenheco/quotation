'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useJournal, useUpdateJournal } from '@/hooks/accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Trash2 } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface JournalEditClientProps {
  journalId: string
  locale: string
}

interface TransactionLine {
  id: string
  accountId: string
  description: string
  debit: string
  credit: string
}

// 共用 input 樣式
const inputClassName =
  'block w-full px-3 py-2 text-sm border rounded-lg bg-white text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 border-slate-200'
const labelClassName = 'block text-sm font-medium text-slate-700 mb-2'

/**
 * 傳票編輯客戶端元件
 * 僅支援草稿狀態的傳票編輯
 */
export default function JournalEditClient({ journalId, locale }: JournalEditClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const { data: journal, isLoading, error } = useJournal(journalId)
  const updateJournal = useUpdateJournal()

  // 表單狀態
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [transactions, setTransactions] = useState<TransactionLine[]>([])

  // 當傳票資料載入後，填充表單
  useEffect(() => {
    if (journal) {
      setDate(journal.date || '')
      setDescription(journal.description || '')

      // 轉換現有分錄
      if (journal.transactions && journal.transactions.length > 0) {
        setTransactions(
          journal.transactions.map((tx) => ({
            id: tx.id,
            accountId: tx.account?.code || tx.account_id,
            description: tx.description || '',
            debit: tx.debit > 0 ? tx.debit.toString() : '',
            credit: tx.credit > 0 ? tx.credit.toString() : '',
          }))
        )
      } else {
        // 至少兩筆分錄
        setTransactions([
          { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
          { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
        ])
      }
    }
  }, [journal])

  // 新增分錄行
  const addLine = useCallback(() => {
    setTransactions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), accountId: '', description: '', debit: '', credit: '' },
    ])
  }, [])

  // 刪除分錄行
  const removeLine = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        if (prev.length <= 2) {
          toast.error(t('accounting.form.minTwoLines'))
          return prev
        }
        return prev.filter((line) => line.id !== id)
      })
    },
    [t]
  )

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error || !journal) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {t('common.error')}: {error?.message || t('common.notFound')}
        </CardContent>
      </Card>
    )
  }

  // 只有草稿可編輯
  const canEdit = journal.status === 'DRAFT'

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Badge variant="destructive" className="mb-4">
              {t(`accounting.status.${journal.status.toLowerCase()}`)}
            </Badge>
            <p className="text-muted-foreground">{t('accounting.journals.draftOnly')}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push(`/${locale}/accounting/journals/${journalId}`)}
            >
              {t('common.back')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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

    // 驗證借貸平衡
    if (!isBalanced) {
      toast.error(t('accounting.form.imbalanced'))
      return
    }

    // 驗證至少有一筆有效分錄
    const validTransactions = transactions.filter(
      (tx) => tx.accountId.trim() && (parseFloat(tx.debit) > 0 || parseFloat(tx.credit) > 0)
    )

    if (validTransactions.length < 2) {
      toast.error(t('accounting.form.minTwoLines'))
      return
    }

    try {
      await updateJournal.mutateAsync({
        id: journalId,
        input: {
          date,
          description: description.trim() || undefined,
          transactions: validTransactions.map((tx) => ({
            account_id: tx.accountId.trim(),
            description: tx.description.trim() || undefined,
            debit: parseFloat(tx.debit) || 0,
            credit: parseFloat(tx.credit) || 0,
          })),
        },
      })

      toast.success(t('common.saveSuccess'))
      router.push(`/${locale}/accounting/journals/${journalId}`)
    } catch (error) {
      console.error('Error updating journal:', error)
      const message = error instanceof Error ? error.message : t('common.saveFailed')
      toast.error(message)
    }
  }

  const isSubmitting = updateJournal.isPending

  return (
    <form onSubmit={handleSubmit}>
      {/* 狀態提示 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('accounting.journals.status')}:</span>
        <Badge variant="outline">{t('accounting.status.draft')}</Badge>
        <span className="text-sm text-muted-foreground">
          ({t('accounting.journals.journalNumber')}: {journal.journal_number})
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('accounting.form.journalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={labelClassName}>
                {t('accounting.journals.date')} <span className="text-red-500">*</span>
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
                {t('accounting.journals.description')}
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('accounting.form.descriptionPlaceholder')}
                className={inputClassName}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分錄明細 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('accounting.form.transactions')}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <PlusCircle className="h-4 w-4 mr-1" />
            {t('accounting.form.addLine')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* 表頭 */}
          <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-3">{t('accounting.form.accountId')}</div>
            <div className="col-span-4">{t('accounting.form.lineDescription')}</div>
            <div className="col-span-2 text-right">{t('accounting.form.debit')}</div>
            <div className="col-span-2 text-right">{t('accounting.form.credit')}</div>
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
                  placeholder={t('accounting.form.linePlaceholder')}
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
            <div className="col-span-7 text-right font-medium">{t('accounting.form.total')}</div>
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
              {t('accounting.form.imbalanced')}:{' '}
              {Math.abs(totals.debit - totals.credit).toLocaleString('zh-TW')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${locale}/accounting/journals/${journalId}`)}
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting || !isBalanced}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
