'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useInvoices } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface InvoiceListProps {
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function InvoiceList({ locale }: InvoiceListProps) {
  const t = useTranslations()
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useInvoices(
    {
      companyId: company?.id || '',
      type: typeFilter as 'OUTPUT' | 'INPUT' | undefined,
      status: statusFilter as 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED' | undefined,
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
          {t('common.error')}: {error.message}
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
          銷項發票
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
        進項發票
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
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      VERIFIED: '已驗證',
      POSTED: '已過帳',
      VOIDED: '已作廢',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const labels: Record<string, string> = {
      UNPAID: '未付款',
      PARTIAL: '部分付款',
      PAID: '已付清',
      OVERDUE: '已逾期',
    }
    const className = status === 'PAID' ? 'bg-green-100 text-green-800' :
                      status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'OVERDUE' ? 'bg-red-100 text-red-800' : ''
    return (
      <Badge variant="outline" className={className}>
        {labels[status] || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">全部類型</option>
              <option value="OUTPUT">銷項發票</option>
              <option value="INPUT">進項發票</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">全部狀態</option>
              <option value="DRAFT">草稿</option>
              <option value="VERIFIED">已驗證</option>
              <option value="POSTED">已過帳</option>
              <option value="VOIDED">已作廢</option>
            </select>
            <Button variant="outline" size="sm">
              新增發票
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 發票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>發票管理</CardTitle>
          <CardDescription>共 {total} 筆發票記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
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
                        href={`/${locale}/accounting/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(invoice.type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString('zh-TW')}
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/accounting/invoices/${invoice.id}`}>
                          {t('common.view')}
                        </Link>
                      </Button>
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
            顯示 {invoices.length} 筆，共 {total} 筆
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
