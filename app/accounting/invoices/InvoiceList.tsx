'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useInvoices, useVerifyInvoice, usePostInvoice } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  const verifyInvoice = useVerifyInvoice()
  const postInvoice = usePostInvoice()

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

  const { data, isLoading, error } = useInvoices(
    {
      companyId: company?.id || '',
      page,
      pageSize: 20,
    },
    !!company?.id
  )

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

  const invoices = data?.invoices || []
  const total = data?.total || 0

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

  return (
    <div className="space-y-6">
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
                  <TableRow key={invoice.id}>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
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
