'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useInvoices, useVerifyInvoice, usePostInvoice, useBatchPost, useDeleteInvoice } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InvoiceType, InvoiceStatus } from '@/lib/dal/accounting'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  VERIFIED: '已審核',
  POSTED: '已過帳',
  VOIDED: '已作廢',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: '未付款',
  PARTIAL: '部分付款',
  PAID: '已付款',
  OVERDUE: '逾期',
}

const INVOICE_TYPE_LABELS: Record<string, string> = {
  OUTPUT: '銷項',
  INPUT: '進項',
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function InvoiceList() {
  const locale = 'zh'
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<InvoiceType | ''>('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const verifyInvoice = useVerifyInvoice()
  const postInvoice = usePostInvoice()
  const batchPost = useBatchPost()
  const deleteInvoiceMutation = useDeleteInvoice()

  const { data, isLoading, error } = useInvoices(
    {
      companyId: company?.id || '',
      page,
      pageSize: 20,
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
    },
    !!company?.id
  )

  const invoices = data?.invoices || []
  const total = data?.total || 0

  // 審核發票
  const handleVerify = async (id: string) => {
    if (!confirm('確定要審核此發票嗎？')) return

    try {
      await verifyInvoice.mutateAsync(id)
      toast.success('發票審核成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '發票審核失敗'
      toast.error(message)
    }
  }

  // 過帳發票
  const handlePost = async (id: string) => {
    if (!confirm('確定要過帳此發票嗎？')) return

    try {
      await postInvoice.mutateAsync(id)
      toast.success('發票過帳成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '發票過帳失敗'
      toast.error(message)
    }
  }

  // 批次審核+過帳
  const handleBatchPost = async () => {
    if (!company?.id) return
    const draftCount = invoices.filter((i) => i.status === 'DRAFT').length
    const verifiedCount = invoices.filter((i) => i.status === 'VERIFIED').length
    const totalCount = draftCount + verifiedCount
    if (totalCount === 0) {
      toast.info('沒有需要處理的發票')
      return
    }

    batchPost.mutate(
      { companyId: company.id },
      {
        onSuccess: (result) => {
          toast.success(result.message)
        },
        onError: (err) => {
          toast.error('批次處理失敗: ' + (err as Error).message)
        },
      }
    )
  }

  // 刪除發票
  const handleDelete = async (id: string, status: string, number: string) => {
    const isNonDraft = status !== 'DRAFT'
    const message = isNonDraft
      ? `此發票 ${number} 為「${STATUS_LABELS[status] || status}」狀態，確定要強制刪除嗎？`
      : `確定要刪除發票 ${number} 嗎？`

    if (!confirm(message)) return

    try {
      await deleteInvoiceMutation.mutateAsync({ id, force: isNonDraft })
      toast.success(`發票 ${number} 已刪除`)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '刪除失敗'
      toast.error(msg)
    }
  }

  // 批次刪除
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const selected = invoices.filter((i) => selectedIds.has(i.id))
    if (!confirm(`確定要刪除選取的 ${selected.length} 張發票嗎？（含非草稿狀態將強制刪除）`)) return

    setIsBatchDeleting(true)
    let successCount = 0
    const failedNumbers: string[] = []
    const successfulIds = new Set<string>()

    for (const inv of selected) {
      try {
        await deleteInvoiceMutation.mutateAsync({ id: inv.id, force: inv.status !== 'DRAFT' })
        successCount++
        successfulIds.add(inv.id)
      } catch {
        failedNumbers.push(inv.number)
      }
    }

    if (successCount > 0) {
      toast.success(`已刪除 ${successCount} 張發票`)
    }
    if (failedNumbers.length > 0) {
      toast.error(`${failedNumbers.length} 張發票刪除失敗：${failedNumbers.join(', ')}`)
    }
    
    // 僅移除成功刪除的項目
    setSelectedIds((prev) => {
      const next = new Set(prev)
      successfulIds.forEach(id => next.delete(id))
      return next
    })
    setIsBatchDeleting(false)
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(invoices.map((i) => i.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 重設篩選
  const handleResetFilters = () => {
    setTypeFilter('')
    setStatusFilter('')
    setSelectedIds(new Set())
    setPage(1)
  }

  const hasActiveFilters = typeFilter !== '' || statusFilter !== ''

  const getTypeBadge = (type: string) => {
    if (type === 'OUTPUT') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          {INVOICE_TYPE_LABELS.OUTPUT}
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
        {INVOICE_TYPE_LABELS.INPUT}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      DRAFT: 'outline',
      VERIFIED: 'secondary',
      POSTED: 'default',
      VOIDED: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {STATUS_LABELS[status] || status}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const className = status === 'PAID' ? 'bg-green-100 text-green-800' :
                      status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'OVERDUE' ? 'bg-red-100 text-red-800' : ''
    return (
      <Badge variant="outline" className={className}>
        {PAYMENT_STATUS_LABELS[status] || status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          錯誤: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 篩選器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as InvoiceType | ''); setSelectedIds(new Set()); setPage(1) }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
            >
              <option value="">全部類型</option>
              <option value="OUTPUT">銷項</option>
              <option value="INPUT">進項</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | ''); setSelectedIds(new Set()); setPage(1) }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
            >
              <option value="">全部狀態</option>
              <option value="DRAFT">草稿</option>
              <option value="VERIFIED">已審核</option>
              <option value="POSTED">已過帳</option>
              <option value="VOIDED">已作廢</option>
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                清除篩選
              </Button>
            )}

            <div className="ml-auto flex gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={isBatchDeleting}
                >
                  {isBatchDeleting ? '刪除中...' : `刪除選取 (${selectedIds.size})`}
                </Button>
              )}
              {invoices.some((i) => i.status === 'DRAFT' || i.status === 'VERIFIED') && (
                <Button
                  onClick={handleBatchPost}
                  disabled={batchPost.isPending}
                  size="sm"
                >
                  {batchPost.isPending ? '處理中...' : '全部審核+過帳'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 發票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>發票管理</CardTitle>
          <CardDescription>共 {total} 筆記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              暫無資料
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={invoices.length > 0 && selectedIds.size === invoices.length}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>發票號碼</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>交易對象</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                  <TableHead className="text-center">付款</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className={selectedIds.has(invoice.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/accounting/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(invoice.type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.counterparty_name || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={invoice.type === 'OUTPUT' ? 'text-green-600' : 'text-red-600'}>
                        {formatAmount(invoice.total_amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentBadge(invoice.payment_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/accounting/invoices/${invoice.id}`}>
                            檢視
                          </Link>
                        </Button>
                        {invoice.status !== 'VOIDED' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/accounting/invoices/${invoice.id}/edit`}>
                              編輯
                            </Link>
                          </Button>
                        )}
                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerify(invoice.id)}
                            disabled={verifyInvoice.isPending}
                          >
                            審核
                          </Button>
                        )}
                        {invoice.status === 'VERIFIED' && (
                          <Button
                            size="sm"
                            onClick={() => handlePost(invoice.id)}
                            disabled={postInvoice.isPending}
                          >
                            過帳
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(invoice.id, invoice.status, invoice.number)}
                          disabled={deleteInvoiceMutation.isPending}
                        >
                          刪除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分頁 */}
      {total > 20 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            顯示 {invoices.length} / {total} 筆
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedIds(new Set()) }}
              disabled={page === 1}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage((p) => p + 1); setSelectedIds(new Set()) }}
              disabled={invoices.length < 20}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
