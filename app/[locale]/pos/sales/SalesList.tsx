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
    const statusMap: Record<string, string> = {
      PENDING: 'pending',
      COMPLETED: 'completed',
      VOIDED: 'voided',
      REFUNDED: 'refunded',
    }
    const className = status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      status === 'VOIDED' ? 'bg-red-100 text-red-800' :
                      status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' : ''
    return (
      <Badge variant={variants[status] || 'outline'} className={className}>
        {t(`pos.salesStatus.${statusMap[status] || status.toLowerCase()}`)}
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
              <CardDescription>{t('pos.sales.dailySales')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(summary.totalSales)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('pos.sales.transactionCount')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.transactionCount || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('pos.sales.cashIncome')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatAmount(summary.cashAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('pos.sales.cardIncome')}</CardDescription>
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
          <CardTitle className="text-lg">{t('pos.sales.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t('pos.sales.date')}</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t('pos.sales.status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t('pos.sales.allStatus')}</option>
                <option value="PENDING">{t('pos.salesStatus.pending')}</option>
                <option value="COMPLETED">{t('pos.salesStatus.completed')}</option>
                <option value="VOIDED">{t('pos.salesStatus.voided')}</option>
                <option value="REFUNDED">{t('pos.salesStatus.refunded')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 銷售列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pos.sales.title')}</CardTitle>
          <CardDescription>{t('pos.sales.dateDescription', { date: dateFilter })}</CardDescription>
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
                  <TableHead>{t('pos.sales.transactionNo')}</TableHead>
                  <TableHead>{t('pos.sales.time')}</TableHead>
                  <TableHead>{t('pos.sales.member')}</TableHead>
                  <TableHead className="text-right">{t('pos.sales.amount')}</TableHead>
                  <TableHead className="text-center">{t('pos.sales.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                        <span className="text-muted-foreground">{t('pos.sales.walkIn')}</span>
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
            {t('pos.sales.showingRange', { start: offset + 1, end: offset + sales.length })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + limit)}
              disabled={sales.length < limit}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
