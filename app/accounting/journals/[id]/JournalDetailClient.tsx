'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useJournal, usePostJournal } from '@/hooks/accounting'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface JournalDetailClientProps {
  journalId: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

/**
 * 傳票詳情客戶端元件
 */
export default function JournalDetailClient({ journalId }: JournalDetailClientProps) {
  const router = useRouter()
  const { data: journal, isLoading, error } = useJournal(journalId)
  const postJournal = usePostJournal()

  // 過帳傳票
  const handlePost = async () => {
    if (!confirm('確定要過帳此傳票嗎？')) return

    try {
      await postJournal.mutateAsync(journalId)
      toast.success('過帳成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '過帳失敗'
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner data-testid="loading-spinner" />
        </CardContent>
      </Card>
    )
  }

  if (error || !journal) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          錯誤: {error?.message || '找不到資料'}
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      DRAFT: 'outline',
      POSTED: 'default',
      VOIDED: 'destructive',
    }
    const statusMap: Record<string, string> = {
      DRAFT: '草稿',
      POSTED: '已過帳',
      VOIDED: '已作廢',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {statusMap[status] || status}
      </Badge>
    )
  }

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, string> = {
      MANUAL: '手動',
      INVOICE: '發票',
      BANK: '銀行',
      ADJUSTMENT: '調整',
    }
    return (
      <Badge variant="secondary">
        {sourceMap[source] || source}
      </Badge>
    )
  }

  // 計算借貸合計
  const transactions = journal.transactions || []
  const totalDebit = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)
  const totalCredit = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="space-y-6">
      {/* 標頭與操作按鈕 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 返回
        </Button>
        <div className="flex gap-2">
          {/* 編輯按鈕（僅草稿狀態顯示） */}
          {journal.status === 'DRAFT' && (
            <Button variant="outline" asChild>
              <Link href={`/accounting/journals/${journalId}/edit`}>
                編輯
              </Link>
            </Button>
          )}
          {/* 過帳按鈕（草稿狀態） */}
          {journal.status === 'DRAFT' && (
            <Button
              onClick={handlePost}
              disabled={postJournal.isPending || !isBalanced}
            >
              {postJournal.isPending ? '處理中...' : '過帳'}
            </Button>
          )}
        </div>
      </div>

      {/* 傳票基本資訊 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{journal.journal_number}</CardTitle>
              <CardDescription>
                {new Date(journal.date).toLocaleDateString('zh-TW')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getSourceBadge(journal.source_type)}
              {getStatusBadge(journal.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 描述 */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                摘要
              </h3>
              <p>{journal.description || '-'}</p>
            </div>

            {/* 來源發票連結 */}
            {journal.invoice_id && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  來源發票
                </h3>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link href={`/accounting/invoices/${journal.invoice_id}`}>
                    查看發票
                  </Link>
                </Button>
              </div>
            )}

            {/* 自動產生標記 */}
            {journal.is_auto_generated && (
              <div>
                <Badge variant="outline" className="text-xs">
                  自動產生
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分錄明細 */}
      <Card>
        <CardHeader>
          <CardTitle>分錄明細</CardTitle>
          <CardDescription>
            {isBalanced ? (
              <span className="text-green-600">借貸平衡</span>
            ) : (
              <span className="text-red-600">借貸不平衡</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目代碼</TableHead>
                <TableHead>科目名稱</TableHead>
                <TableHead>摘要</TableHead>
                <TableHead className="text-right">借方</TableHead>
                <TableHead className="text-right">貸方</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => (
                <TableRow key={tx.id || index}>
                  <TableCell className="font-mono">
                    {tx.account?.code || '-'}
                  </TableCell>
                  <TableCell>
                    {tx.account?.name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.description || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {tx.debit > 0 ? formatAmount(tx.debit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {tx.credit > 0 ? formatAmount(tx.credit) : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {/* 合計列 */}
              <TableRow className="font-bold border-t-2">
                <TableCell colSpan={3} className="text-right">
                  合計
                </TableCell>
                <TableCell className="text-right">
                  {formatAmount(totalDebit)}
                </TableCell>
                <TableCell className="text-right">
                  {formatAmount(totalCredit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 過帳資訊 */}
      {journal.status === 'POSTED' && journal.posted_at && (
        <Card>
          <CardHeader>
            <CardTitle>過帳資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  過帳時間
                </h3>
                <p className="font-medium">
                  {new Date(journal.posted_at).toLocaleString('zh-TW')}
                </p>
              </div>
              {journal.posted_by && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    過帳人員
                  </h3>
                  <p className="font-medium">{journal.posted_by}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
