'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSales, useDailySummary } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SalesListProps {
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function SalesList({ locale }: SalesListProps) {
  const t = useTranslations()
  const { tenant, activeBranch } = useTenant()
  const [offset, setOffset] = useState(0)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const limit = 20

  const { data, isLoading, error } = useSales(
    {
      tenantId: tenant?.id || '',
      branchId: activeBranch?.id,
      status: statusFilter as 'PENDING' | 'COMPLETED' | 'VOIDED' | 'REFUNDED' | undefined,
      startDate: dateFilter,
      endDate: dateFilter,
      pageSize: limit,
      page: Math.floor(offset / limit) + 1,
    },
    !!tenant?.id
  )

  const { data: summary } = useDailySummary(
    tenant?.id || '',
    activeBranch?.id || '',
    dateFilter,
    !!tenant?.id && !!activeBranch?.id
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

  const sales = data?.transactions || []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive' | 'warning'> = {
      PENDING: 'warning',
      COMPLETED: 'default',
      VOIDED: 'destructive',
      REFUNDED: 'secondary',
    }
    const labels: Record<string, string> = {
      PENDING: '處理中',
      COMPLETED: '已完成',
      VOIDED: '已作廢',
      REFUNDED: '已退款',
    }
    const className = status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      status === 'VOIDED' ? 'bg-red-100 text-red-800' :
                      status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' : ''
    return (
      <Badge variant={variants[status] || 'outline'} className={className}>
        {labels[status] || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 每日摘要卡片 */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>今日營業額</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(summary.totalSales)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>交易筆數</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.transactionCount || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>現金收入</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatAmount(summary.cashAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>刷卡收入</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatAmount(summary.cardAmount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">日期</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">狀態</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">全部狀態</option>
                <option value="PENDING">處理中</option>
                <option value="COMPLETED">已完成</option>
                <option value="VOIDED">已作廢</option>
                <option value="REFUNDED">已退款</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 銷售列表 */}
      <Card>
        <CardHeader>
          <CardTitle>銷售記錄</CardTitle>
          <CardDescription>{dateFilter} 的銷售交易</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>交易編號</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>會員</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/pos/sales/${sale.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {sale.transaction_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sale.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      {sale.member_name || (
                        <span className="text-muted-foreground">散客</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatAmount(sale.total_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(sale.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/pos/sales/${sale.id}`}>
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
      {sales.length >= limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            顯示第 {offset + 1} 到 {offset + sales.length} 筆
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + limit)}
              disabled={sales.length < limit}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
